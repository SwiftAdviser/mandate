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
    private const CHAIN_ID     = 84532;

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

        // Seed USDC into token_registry so PriceOracleService can resolve it
        TokenRegistry::create([
            'chain_id'  => self::CHAIN_ID,
            'address'   => self::USDC_ADDRESS,
            'symbol'    => 'USDC',
            'decimals'  => 6,
            'is_stable' => true,
        ]);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function createAgentWithPolicy(array $policyOverrides = []): array
    {
        $agent = Agent::create([
            'id'          => Str::uuid(),
            'name'        => 'TestAgent',
            'evm_address' => '0xabcdef1234567890abcdef1234567890abcdef12',
            'chain_id'    => self::CHAIN_ID,
        ]);

        $policy = Policy::create(array_merge([
            'agent_id'               => $agent->id,
            'spend_limit_per_tx_usd' => 100,
            'spend_limit_per_day_usd'=> 1000,
            'is_active'              => true,
            'version'                => 1,
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
            'chainId'              => self::CHAIN_ID,
            'nonce'                => 0,
            'to'                   => self::USDC_ADDRESS,
            'calldata'             => '0xa9059cbb'
                . '000000000000000000000000abcdef1234567890abcdef1234567890abcdef12'
                . '0000000000000000000000000000000000000000000000000000000000989680',
            'valueWei'             => '0',
            'gasLimit'             => '100000',
            'maxFeePerGas'         => '1000000000',
            'maxPriorityFeePerGas' => '1000000000',
            'txType'               => 2,
            'accessList'           => [],
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

        $merged['intentHash'] = '0x' . hash('sha3-256', $packed);

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
            'spend_limit_per_tx_usd'  => 1,
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
            'spend_limit_per_tx_usd'  => 1000,
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

        $first  = $this->service()->validate($agent, $payload);
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
            'spend_limit_per_tx_usd'    => 1000,
            'spend_limit_per_day_usd'   => 10000,
            'require_approval_above_usd'=> 5.0,
        ]);

        $result = $this->service()->validate($agent, $this->buildPayload());

        // allowed=true but requiresApproval=true
        $this->assertTrue($result['allowed']);
        $this->assertTrue($result['requiresApproval']);
        $this->assertNotNull($result['approvalId']);
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
}
