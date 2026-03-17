<?php

namespace Tests\Unit;

use App\Models\Agent;
use App\Models\Policy;
use App\Models\TokenRegistry;
use App\Services\PolicyEngineService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class PolicyEngineServiceTest extends TestCase
{
    use RefreshDatabase;

    // USDC on Base Sepolia (matches payload 'to')
    private const USDC_ADDRESS = '0x036cbd53842c5426634e7929541ec2318f3dcf7e';

    private const CHAIN_ID = 84532;

    protected function setUp(): void
    {
        parent::setUp();

        Http::preventStrayRequests();

        // Stub price oracle — Alchemy returns $1.00 per token unit
        Http::fake([
            '*' => Http::response([
                'data' => [
                    [
                        'prices' => [
                            ['value' => '1.00'],
                        ],
                    ],
                ],
            ], 200),
        ]);

        // Disable aegis and reputation by default so existing tests don't hit external APIs
        config(['mandate.aegis.enabled' => false]);
        config(['mandate.reputation.enabled' => false]);

        // Seed USDC into token_registry so PriceOracleService can resolve it
        TokenRegistry::create([
            'chain_id' => self::CHAIN_ID,
            'address' => self::USDC_ADDRESS,
            'symbol' => 'USDC',
            'decimals' => 6,
            'is_stable' => true,
        ]);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function createAgentWithPolicy(array $policyOverrides = []): array
    {
        $agent = Agent::create([
            'id' => Str::uuid(),
            'name' => 'TestAgent',
            'evm_address' => '0xabcdef1234567890abcdef1234567890abcdef12',
            'chain_id' => self::CHAIN_ID,
        ]);

        $policy = Policy::create(array_merge([
            'agent_id' => $agent->id,
            'spend_limit_per_tx_usd' => 100,
            'spend_limit_per_day_usd' => 1000,
            'is_active' => true,
            'version' => 1,
        ], $policyOverrides));

        return [$agent, $policy];
    }

    /**
     * Build a valid ERC20 transfer payload. Raw amount defaults to 10_000_000
     * (10 USDC at 6 decimals = $10.00 at the $1/unit stub price).
     */
    private function buildPayload(array $overrides = []): array
    {
        // Default: transfer(0xabcdef…, 10_000_000)
        // 10_000_000 decimal = 0x989680 hex, padded to 32 bytes
        $base = [
            'chainId' => self::CHAIN_ID,
            'nonce' => 0,
            'to' => self::USDC_ADDRESS,
            'calldata' => '0xa9059cbb'
                .'000000000000000000000000abcdef1234567890abcdef1234567890abcdef12'
                .'0000000000000000000000000000000000000000000000000000000000989680',
            'valueWei' => '0',
            'gasLimit' => '100000',
            'maxFeePerGas' => '1000000000',
            'maxPriorityFeePerGas' => '1000000000',
            'txType' => 2,
            'accessList' => [],
            'reason' => 'Test payment for March invoice',
        ];

        $merged = array_merge($base, $overrides);

        // Compute intentHash matching the server algorithm
        $packed = implode('|', [
            $merged['chainId'],
            $merged['nonce'],
            strtolower($merged['to']),
            strtolower($merged['calldata'] ?? '0x'),
            $merged['valueWei'] ?? '0',
            $merged['gasLimit'],
            $merged['maxFeePerGas'],
            $merged['maxPriorityFeePerGas'],
            $merged['txType'] ?? 2,
            json_encode($merged['accessList'] ?? []),
        ]);

        $merged['intentHash'] = '0x'.\kornrunner\Keccak::hash($packed, 256);

        return $merged;
    }

    private function service(): PolicyEngineService
    {
        return app(PolicyEngineService::class);
    }

    // -------------------------------------------------------------------------
    // Tests
    // -------------------------------------------------------------------------

    /** @test */
    public function it_allows_valid_intent_under_policy_limits(): void
    {
        [$agent] = $this->createAgentWithPolicy();

        $result = $this->service()->validate($agent, $this->buildPayload());

        $this->assertTrue($result['allowed']);
        $this->assertNotNull($result['intentId']);
        $this->assertNull($result['blockReason']);
    }

    /** @test */
    public function it_blocks_when_circuit_breaker_is_active(): void
    {
        [$agent] = $this->createAgentWithPolicy();

        $agent->update(['circuit_breaker_active' => true]);
        // Flush cache so the service reads from DB
        \Illuminate\Support\Facades\Cache::flush();

        $result = $this->service()->validate($agent, $this->buildPayload());

        $this->assertFalse($result['allowed']);
        $this->assertSame('circuit_breaker_active', $result['blockReason']);
    }

    /** @test */
    public function it_blocks_when_no_active_policy(): void
    {
        [$agent, $policy] = $this->createAgentWithPolicy();

        $policy->delete();

        $result = $this->service()->validate($agent, $this->buildPayload());

        $this->assertFalse($result['allowed']);
        $this->assertSame('no_active_policy', $result['blockReason']);
    }

    /** @test */
    public function it_blocks_when_amount_exceeds_per_tx_limit(): void
    {
        // Policy: $1 per-tx cap. Payload: 10 USDC = $10. Should block.
        [$agent] = $this->createAgentWithPolicy([
            'spend_limit_per_tx_usd' => 1,
            'spend_limit_per_day_usd' => 10000,
        ]);

        // 10_000_000 raw = 10 USDC at 6 decimals; stable price = $1/unit → $10
        $result = $this->service()->validate($agent, $this->buildPayload());

        $this->assertFalse($result['allowed']);
        $this->assertSame('per_tx_limit_exceeded', $result['blockReason']);
    }

    /** @test */
    public function it_blocks_when_daily_quota_exceeded(): void
    {
        // Policy: $5 daily cap. Payload: 10 USDC = $10. Should block on quota.
        [$agent] = $this->createAgentWithPolicy([
            'spend_limit_per_tx_usd' => 1000,
            'spend_limit_per_day_usd' => 5,
        ]);

        $result = $this->service()->validate($agent, $this->buildPayload());

        $this->assertFalse($result['allowed']);
        $this->assertSame('daily_quota_exceeded', $result['blockReason']);
    }

    /** @test */
    public function it_returns_existing_intent_on_duplicate_hash(): void
    {
        [$agent] = $this->createAgentWithPolicy();

        $payload = $this->buildPayload();

        $first = $this->service()->validate($agent, $payload);
        $second = $this->service()->validate($agent, $payload);

        $this->assertTrue($first['allowed']);
        $this->assertTrue($second['allowed']);
        $this->assertSame($first['intentId'], $second['intentId']);
    }

    /** @test */
    public function it_requires_approval_when_above_threshold(): void
    {
        // Threshold: $5. Payload: 10 USDC = $10. Per-tx limit high enough.
        [$agent] = $this->createAgentWithPolicy([
            'spend_limit_per_tx_usd' => 1000,
            'spend_limit_per_day_usd' => 10000,
            'require_approval_above_usd' => 5.0,
        ]);

        $result = $this->service()->validate($agent, $this->buildPayload());

        // allowed=true but requiresApproval=true
        $this->assertTrue($result['allowed']);
        $this->assertTrue($result['requiresApproval']);
        $this->assertNotNull($result['approvalId']);
    }

    /** @test */
    public function intent_hash_matches_typescript_sdk(): void
    {
        // Hardcoded hash computed by TS SDK's computeIntentHash() with the same
        // default test payload. If this fails, PHP and TS algorithms have diverged.
        $packed = implode('|', [
            '84532',
            '0',
            '0x036cbd53842c5426634e7929541ec2318f3dcf7e',
            '0xa9059cbb000000000000000000000000abcdef1234567890abcdef1234567890abcdef120000000000000000000000000000000000000000000000000000000000989680',
            '0',
            '100000',
            '1000000000',
            '1000000000',
            '2',
            '[]',
        ]);

        $hash = '0x'.\kornrunner\Keccak::hash($packed, 256);

        $this->assertEquals(
            '0xde86a691b90ee7c3fd7e09c1e102e9a7746ef00c9ab16b78e92501f9800a5152',
            $hash
        );
    }

    /** @test */
    public function it_blocks_when_address_not_in_allowlist(): void
    {
        // Allowlist contains only a dummy address, not our USDC contract.
        [$agent] = $this->createAgentWithPolicy([
            'allowed_addresses' => ['0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'],
        ]);

        $result = $this->service()->validate($agent, $this->buildPayload());

        $this->assertFalse($result['allowed']);
        $this->assertSame('address_not_allowed', $result['blockReason']);
    }

    // -------------------------------------------------------------------------
    // Risk Intelligence (Aegis) Tests
    // -------------------------------------------------------------------------

    private function enableAegisWithFakes(array $overrides = []): void
    {
        config(['mandate.aegis.enabled' => true, 'mandate.aegis.retries' => 0]);

        // Clear previous Http::fake stubs (Laravel merges rather than replaces)
        $factory = app(\Illuminate\Http\Client\Factory::class);
        $ref = new \ReflectionProperty($factory, 'stubCallbacks');
        $ref->setAccessible(true);
        $ref->setValue($factory, collect());

        $fakes = array_merge([
            'https://api.web3antivirus.io/api/public/v1/extension/simulation/*' => Http::response(['detectors' => []]),
            'https://api.web3antivirus.io/api/public/v1/extension/account/*' => Http::response(['toxic_score' => 0]),
            'https://api.web3antivirus.io/api/public/v2/extension/token-intelligence/*' => Http::response(['risks' => []]),
        ], $overrides, [
            '*' => Http::response(['data' => [['prices' => [['value' => '1.00']]]]]),
        ]);

        Http::fake($fakes);
    }

    /** @test */
    public function it_blocks_when_aegis_returns_critical(): void
    {
        $this->enableAegisWithFakes([
            'https://api.web3antivirus.io/api/public/v1/extension/simulation/*' => Http::response([
                'detectors' => [['code' => 'MALICIOUS', 'description' => 'Malicious contract detected']],
            ]),
        ]);

        [$agent] = $this->createAgentWithPolicy(['risk_scan_enabled' => true]);
        $result = $this->service()->validate($agent, $this->buildPayload());

        $this->assertFalse($result['allowed']);
        $this->assertSame('aegis_critical_risk', $result['blockReason']);
    }

    /** @test */
    public function it_forces_approval_when_aegis_returns_high(): void
    {
        $this->enableAegisWithFakes([
            'https://api.web3antivirus.io/api/public/v1/extension/account/*' => Http::response(['toxic_score' => 75]),
        ]);

        [$agent] = $this->createAgentWithPolicy(['risk_scan_enabled' => true]);
        $result = $this->service()->validate($agent, $this->buildPayload());

        $this->assertTrue($result['allowed']);
        $this->assertTrue($result['requiresApproval']);
        $this->assertSame('HIGH', $result['riskLevel']);
    }

    /** @test */
    public function it_stores_risk_data_on_intent(): void
    {
        $this->enableAegisWithFakes([
            'https://api.web3antivirus.io/api/public/v1/extension/account/*' => Http::response(['toxic_score' => 5]),
        ]);

        [$agent] = $this->createAgentWithPolicy(['risk_scan_enabled' => true]);
        $result = $this->service()->validate($agent, $this->buildPayload());

        $this->assertTrue($result['allowed']);

        $intent = \App\Models\TxIntent::find($result['intentId']);
        $this->assertNotNull($intent);
        $this->assertSame('LOW', $intent->risk_level);
        $this->assertFalse($intent->risk_degraded);
        $this->assertNotNull($intent->risk_assessment);
    }

    /** @test */
    public function it_proceeds_when_aegis_degraded(): void
    {
        $this->enableAegisWithFakes([
            'https://api.web3antivirus.io/api/public/v1/extension/simulation/*' => Http::response(null, 500),
            'https://api.web3antivirus.io/api/public/v1/extension/account/*' => Http::response(null, 500),
            'https://api.web3antivirus.io/api/public/v2/extension/token-intelligence/*' => Http::response(null, 500),
        ]);

        [$agent] = $this->createAgentWithPolicy(['risk_scan_enabled' => true]);
        $result = $this->service()->validate($agent, $this->buildPayload());

        $this->assertTrue($result['allowed']);
        $this->assertTrue($result['riskDegraded']);
    }

    /** @test */
    public function it_skips_risk_scan_when_policy_disables_it(): void
    {
        // aegis.enabled stays false from setUp — but we explicitly check risk_scan_enabled
        config(['mandate.aegis.enabled' => true]);

        [$agent] = $this->createAgentWithPolicy(['risk_scan_enabled' => false]);
        $result = $this->service()->validate($agent, $this->buildPayload());

        $this->assertTrue($result['allowed']);
        $this->assertNull($result['riskLevel'] ?? null);
    }

    // -------------------------------------------------------------------------
    // Reputation (EIP-8004) Tests
    // -------------------------------------------------------------------------

    private function enableReputationWithFakes(array $subgraphResponse): void
    {
        config([
            'mandate.reputation.enabled' => true,
            'mandate.reputation.subgraphs' => [
                84532 => 'https://gateway.thegraph.com/api/test/subgraphs/id/base-sepolia',
            ],
        ]);

        // Clear previous Http::fake stubs
        $factory = app(\Illuminate\Http\Client\Factory::class);
        $ref = new \ReflectionProperty($factory, 'stubCallbacks');
        $ref->setAccessible(true);
        $ref->setValue($factory, collect());

        Http::fake(array_merge($subgraphResponse, [
            '*' => Http::response(['data' => [['prices' => [['value' => '1.00']]]]]),
        ]));
    }

    /** @test */
    public function it_requires_approval_for_unregistered_agent(): void
    {
        $this->enableReputationWithFakes([
            'https://gateway.thegraph.com/api/test/subgraphs/id/base-sepolia' => Http::response([
                'data' => ['agents' => []],
            ]),
        ]);

        [$agent] = $this->createAgentWithPolicy();
        $result = $this->service()->validate($agent, $this->buildPayload());

        $this->assertTrue($result['allowed']);
        $this->assertTrue($result['requiresApproval']);
    }

    /** @test */
    public function it_requires_approval_for_low_reputation_agent(): void
    {
        $this->enableReputationWithFakes([
            'https://gateway.thegraph.com/api/test/subgraphs/id/base-sepolia' => Http::sequence()
                ->push(['data' => ['agents' => [
                    ['id' => 'agent-1', 'agentId' => 'eip8004-1', 'chainId' => '84532', 'name' => 'LowRepBot'],
                ]]])
                ->push(['data' => ['feedbacks' => [
                    ['id' => 'fb1', 'value' => '20', 'clientAddress' => '0xaaa', 'tag1' => '', 'tag2' => '', 'createdAt' => '1710000000'],
                    ['id' => 'fb2', 'value' => '10', 'clientAddress' => '0xbbb', 'tag1' => '', 'tag2' => '', 'createdAt' => '1710000001'],
                ]]]),
        ]);

        [$agent] = $this->createAgentWithPolicy();
        $result = $this->service()->validate($agent, $this->buildPayload());

        $this->assertTrue($result['allowed']);
        $this->assertTrue($result['requiresApproval']); // score 15 < threshold 30
    }

    /** @test */
    public function it_skips_reputation_when_disabled(): void
    {
        // reputation.enabled is false from setUp
        [$agent] = $this->createAgentWithPolicy();
        $result = $this->service()->validate($agent, $this->buildPayload());

        $this->assertTrue($result['allowed']);
        $this->assertFalse($result['requiresApproval']);
    }

    /** @test */
    public function it_degrades_gracefully_when_reputation_unavailable(): void
    {
        $this->enableReputationWithFakes([
            'https://gateway.thegraph.com/api/test/subgraphs/id/base-sepolia' => Http::response(null, 500),
        ]);

        [$agent] = $this->createAgentWithPolicy();
        $result = $this->service()->validate($agent, $this->buildPayload());

        // degraded=true → no forced approval, validation continues normally
        $this->assertTrue($result['allowed']);
        $this->assertFalse($result['requiresApproval']);
    }

    // -------------------------------------------------------------------------
    // Block Detail Tests
    // -------------------------------------------------------------------------

    /** @test */
    public function it_returns_block_detail_with_per_tx_limit(): void
    {
        [$agent] = $this->createAgentWithPolicy([
            'spend_limit_per_tx_usd' => 1,
            'spend_limit_per_day_usd' => 10000,
        ]);

        $result = $this->service()->validate($agent, $this->buildPayload());

        $this->assertFalse($result['allowed']);
        $this->assertSame('per_tx_limit_exceeded', $result['blockReason']);
        $this->assertNotEmpty($result['blockDetail']);
        $this->assertStringContainsString('$1', $result['blockDetail']);
    }

    /** @test */
    public function it_returns_block_detail_with_address_not_allowed(): void
    {
        [$agent] = $this->createAgentWithPolicy([
            'allowed_addresses' => ['0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'],
        ]);

        $result = $this->service()->validate($agent, $this->buildPayload());

        $this->assertFalse($result['allowed']);
        $this->assertSame('address_not_allowed', $result['blockReason']);
        $this->assertStringContainsString('not in allowlist', $result['blockDetail']);
    }

    /** @test */
    public function it_returns_block_detail_with_no_active_policy(): void
    {
        [$agent, $policy] = $this->createAgentWithPolicy();
        $policy->delete();

        $result = $this->service()->validate($agent, $this->buildPayload());

        $this->assertFalse($result['allowed']);
        $this->assertNotEmpty($result['blockDetail']);
    }

    /** @test */
    public function it_returns_block_detail_with_circuit_breaker(): void
    {
        [$agent] = $this->createAgentWithPolicy();
        $agent->update(['circuit_breaker_active' => true]);
        \Illuminate\Support\Facades\Cache::flush();

        $result = $this->service()->validate($agent, $this->buildPayload());

        $this->assertFalse($result['allowed']);
        $this->assertSame('circuit_breaker_active', $result['blockReason']);
        $this->assertNotEmpty($result['blockDetail']);
        $this->assertStringContainsString('circuit breaker', $result['blockDetail']);
    }

    /** @test */
    public function it_returns_block_detail_with_daily_quota_exceeded(): void
    {
        [$agent] = $this->createAgentWithPolicy([
            'spend_limit_per_tx_usd' => 1000,
            'spend_limit_per_day_usd' => 5,
        ]);

        $result = $this->service()->validate($agent, $this->buildPayload());

        $this->assertFalse($result['allowed']);
        $this->assertSame('daily_quota_exceeded', $result['blockReason']);
        $this->assertNotEmpty($result['blockDetail']);
        $this->assertStringContainsString('$5', $result['blockDetail']);
    }

    /** @test */
    public function it_returns_block_detail_with_aegis_critical(): void
    {
        $this->enableAegisWithFakes([
            'https://api.web3antivirus.io/api/public/v1/extension/simulation/*' => Http::response([
                'detectors' => [['code' => 'MALICIOUS', 'description' => 'Malicious contract detected']],
            ]),
        ]);

        [$agent] = $this->createAgentWithPolicy(['risk_scan_enabled' => true]);
        $result = $this->service()->validate($agent, $this->buildPayload());

        $this->assertFalse($result['allowed']);
        $this->assertSame('aegis_critical_risk', $result['blockReason']);
        $this->assertNotEmpty($result['blockDetail']);
        $this->assertStringContainsString('CRITICAL', $result['blockDetail']);
    }
}
