<?php

namespace Tests\Feature;

use App\Models\Agent;
use App\Models\AgentApiKey;
use App\Models\ApprovalQueue;
use App\Models\Policy;
use App\Models\TokenRegistry;
use App\Models\TxIntent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Tests\TestCase;

class ApiTest extends TestCase
{
    use RefreshDatabase;

    private const USDC_ADDRESS = '0x036cbd53842c5426634e7929541ec2318f3dcf7e';
    private const CHAIN_ID     = 84532;

    private User $user;

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

        config(['mandate.reputation.enabled' => false]);

        // Seed USDC into token_registry so PriceOracleService can resolve it
        TokenRegistry::create([
            'chain_id'  => self::CHAIN_ID,
            'address'   => self::USDC_ADDRESS,
            'symbol'    => 'USDC',
            'decimals'  => 6,
            'is_stable' => true,
        ]);

        $this->user = User::factory()->create();
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function createAgent(array $overrides = []): Agent
    {
        return Agent::create(array_merge([
            'id'          => Str::uuid(),
            'name'        => 'TestAgent',
            'evm_address' => '0xabcdef1234567890abcdef1234567890abcdef12',
            'chain_id'    => self::CHAIN_ID,
            'user_id'     => $this->user->id,
        ], $overrides));
    }

    private function issueRuntimeKey(Agent $agent): string
    {
        [$rawKey] = AgentApiKey::generate($agent);
        return $rawKey;
    }

    private function buildPayload(array $overrides = []): array
    {
        $base = [
            'chainId'              => self::CHAIN_ID,
            'nonce'                => 0,
            'to'                   => self::USDC_ADDRESS,
            'calldata'             => '0xa9059cbb000000000000000000000000abcdef1234567890abcdef1234567890abcdef120000000000000000000000000000000000000000000000000000000000989680',
            'valueWei'             => '0',
            'gasLimit'             => '100000',
            'maxFeePerGas'         => '1000000000',
            'maxPriorityFeePerGas' => '1000000000',
            'txType'               => 2,
            'accessList'           => [],
            'reason'               => 'Test payment for March invoice',
        ];

        $merged = array_merge($base, $overrides);

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

        $merged['intentHash'] = '0x' . \kornrunner\Keccak::hash($packed, 256);

        return $merged;
    }

    // -------------------------------------------------------------------------
    // Registration (no auth)
    // -------------------------------------------------------------------------

    public function test_agent_registration_creates_agent_and_returns_runtime_key(): void
    {
        $response = $this->postJson('/api/agents/register', [
            'name'       => 'MyAgent',
            'evmAddress' => '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12',
            'chainId'    => self::CHAIN_ID,
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['agentId', 'runtimeKey', 'claimUrl'])
            ->assertJsonPath('chainId', self::CHAIN_ID);

        $this->assertDatabaseHas('agents', [
            'name'        => 'MyAgent',
            'evm_address' => '0xabcdef1234567890abcdef1234567890abcdef12',
            'chain_id'    => self::CHAIN_ID,
        ]);
    }

    public function test_registration_requires_valid_evm_address(): void
    {
        $response = $this->postJson('/api/agents/register', [
            'name'       => 'BadAgent',
            'evmAddress' => 'notanaddress',
            'chainId'    => self::CHAIN_ID,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['evmAddress']);
    }

    public function test_registration_creates_default_policy(): void
    {
        $response = $this->postJson('/api/agents/register', [
            'name'       => 'PolicyAgent',
            'evmAddress' => '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12',
            'chainId'    => self::CHAIN_ID,
        ]);

        $response->assertStatus(201);

        $agentId = $response->json('agentId');

        $this->assertDatabaseHas('policies', [
            'agent_id'  => $agentId,
            'is_active' => true,
        ]);
    }

    // -------------------------------------------------------------------------
    // Runtime key auth
    // -------------------------------------------------------------------------

    public function test_validate_requires_runtime_key(): void
    {
        $response = $this->postJson('/api/validate', $this->buildPayload());

        $response->assertStatus(401);
    }

    public function test_validate_rejects_invalid_key(): void
    {
        $response = $this->withHeaders([
            'Authorization' => 'Bearer mndt_test_thiskeyiswrongandwillnotexist0000000',
        ])->postJson('/api/validate', $this->buildPayload());

        $response->assertStatus(401);
    }

    // -------------------------------------------------------------------------
    // Validate endpoint
    // -------------------------------------------------------------------------

    public function test_validate_allows_valid_intent(): void
    {
        $agent  = $this->createAgent();
        Policy::create([
            'agent_id'                => $agent->id,
            'spend_limit_per_tx_usd'  => 100,
            'spend_limit_per_day_usd' => 1000,
            'is_active'               => true,
            'version'                 => 1,
        ]);
        $rawKey = $this->issueRuntimeKey($agent);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $rawKey,
        ])->postJson('/api/validate', $this->buildPayload());

        $response->assertStatus(200)
            ->assertJsonPath('allowed', true)
            ->assertJsonStructure(['intentId'])
            ->assertJsonMissing(['blockReason' => true]);

        $this->assertNotNull($response->json('intentId'));
    }

    public function test_validate_blocks_when_circuit_breaker_active(): void
    {
        $agent = $this->createAgent(['circuit_breaker_active' => true]);
        Policy::create([
            'agent_id'                => $agent->id,
            'spend_limit_per_tx_usd'  => 100,
            'spend_limit_per_day_usd' => 1000,
            'is_active'               => true,
            'version'                 => 1,
        ]);
        $rawKey = $this->issueRuntimeKey($agent);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $rawKey,
        ])->postJson('/api/validate', $this->buildPayload());

        // RuntimeKeyAuth checks circuit breaker and returns 403 before reaching the controller
        $response->assertStatus(403);
    }

    public function test_validate_blocks_per_tx_limit(): void
    {
        $agent = $this->createAgent();
        // Policy: $1 per-tx cap. Payload calldata = 10 USDC = $10 at stub price. Should block.
        Policy::create([
            'agent_id'                => $agent->id,
            'spend_limit_per_tx_usd'  => 1,
            'spend_limit_per_day_usd' => 10000,
            'is_active'               => true,
            'version'                 => 1,
        ]);
        $rawKey = $this->issueRuntimeKey($agent);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $rawKey,
        ])->postJson('/api/validate', $this->buildPayload());

        $response->assertStatus(422)
            ->assertJsonPath('allowed', false)
            ->assertJsonPath('blockReason', 'per_tx_limit_exceeded');
    }

    public function test_validate_duplicate_intent_hash_returns_existing(): void
    {
        $agent = $this->createAgent();
        Policy::create([
            'agent_id'                => $agent->id,
            'spend_limit_per_tx_usd'  => 100,
            'spend_limit_per_day_usd' => 1000,
            'is_active'               => true,
            'version'                 => 1,
        ]);
        $rawKey  = $this->issueRuntimeKey($agent);
        $headers = ['Authorization' => 'Bearer ' . $rawKey];
        $payload = $this->buildPayload();

        $first  = $this->withHeaders($headers)->postJson('/api/validate', $payload);
        $second = $this->withHeaders($headers)->postJson('/api/validate', $payload);

        $first->assertStatus(200)->assertJsonPath('allowed', true);
        $second->assertStatus(200)->assertJsonPath('allowed', true);

        $this->assertSame($first->json('intentId'), $second->json('intentId'));
    }

    // -------------------------------------------------------------------------
    // Intent events
    // -------------------------------------------------------------------------

    public function test_post_event_transitions_to_broadcasted(): void
    {
        Queue::fake();

        $agent = $this->createAgent();
        Policy::create([
            'agent_id'                => $agent->id,
            'spend_limit_per_tx_usd'  => 100,
            'spend_limit_per_day_usd' => 1000,
            'is_active'               => true,
            'version'                 => 1,
        ]);
        $rawKey  = $this->issueRuntimeKey($agent);
        $headers = ['Authorization' => 'Bearer ' . $rawKey];

        // First validate to create the intent
        $validateResponse = $this->withHeaders($headers)->postJson('/api/validate', $this->buildPayload());
        $validateResponse->assertStatus(200);
        $intentId = $validateResponse->json('intentId');

        // Now post the txHash event
        $txHash   = '0x' . str_repeat('ab', 32);
        $response = $this->withHeaders($headers)->postJson("/api/intents/{$intentId}/events", [
            'txHash' => $txHash,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('intentId', $intentId)
            ->assertJsonPath('status', TxIntent::STATUS_BROADCASTED)
            ->assertJsonPath('txHash', $txHash);

        $this->assertDatabaseHas('tx_intents', [
            'id'      => $intentId,
            'status'  => TxIntent::STATUS_BROADCASTED,
            'tx_hash' => $txHash,
        ]);
    }

    public function test_post_event_requires_reserved_or_approved_status(): void
    {
        Queue::fake();

        $agent  = $this->createAgent();
        $policy = Policy::create([
            'agent_id'                => $agent->id,
            'spend_limit_per_tx_usd'  => 100,
            'spend_limit_per_day_usd' => 1000,
            'is_active'               => true,
            'version'                 => 1,
        ]);
        $rawKey  = $this->issueRuntimeKey($agent);
        $headers = ['Authorization' => 'Bearer ' . $rawKey];

        // Create an intent already in 'confirmed' (terminal) status directly in DB
        $intent = TxIntent::create([
            'id'                    => Str::uuid(),
            'agent_id'              => $agent->id,
            'policy_id'             => $policy->id,
            'intent_hash'           => '0x' . str_repeat('cc', 32),
            'chain_id'              => self::CHAIN_ID,
            'nonce'                 => 99,
            'to_address'            => self::USDC_ADDRESS,
            'calldata'              => '0x',
            'value_wei'             => '0',
            'gas_limit'             => '21000',
            'max_fee_per_gas'       => '1000000000',
            'max_priority_fee_per_gas' => '1000000000',
            'tx_type'               => 2,
            'access_list'           => [],
            'status'                => TxIntent::STATUS_CONFIRMED,
            'expires_at'            => null,
        ]);

        $response = $this->withHeaders($headers)->postJson("/api/intents/{$intent->id}/events", [
            'txHash' => '0x' . str_repeat('dd', 32),
        ]);

        // Confirmed is a terminal status — controller returns 409
        $response->assertStatus(409);
    }

    public function test_get_status_returns_intent_state(): void
    {
        Queue::fake();

        $agent = $this->createAgent();
        Policy::create([
            'agent_id'                => $agent->id,
            'spend_limit_per_tx_usd'  => 100,
            'spend_limit_per_day_usd' => 1000,
            'is_active'               => true,
            'version'                 => 1,
        ]);
        $rawKey  = $this->issueRuntimeKey($agent);
        $headers = ['Authorization' => 'Bearer ' . $rawKey];

        $validateResponse = $this->withHeaders($headers)->postJson('/api/validate', $this->buildPayload());
        $validateResponse->assertStatus(200);
        $intentId = $validateResponse->json('intentId');

        $response = $this->withHeaders($headers)->getJson("/api/intents/{$intentId}/status");

        $response->assertStatus(200)
            ->assertJsonPath('intentId', $intentId)
            ->assertJsonPath('status', TxIntent::STATUS_RESERVED)
            ->assertJsonStructure(['intentId', 'status', 'txHash', 'expiresAt']);
    }

    // -------------------------------------------------------------------------
    // Circuit breaker (admin route)
    // -------------------------------------------------------------------------

    public function test_circuit_breaker_toggle(): void
    {
        $agent = $this->createAgent(['circuit_breaker_active' => false]);

        // Toggle ON
        $toggleResponse = $this->actingAs($this->user)
            ->postJson("/api/agents/{$agent->id}/circuit-break");

        $toggleResponse->assertStatus(200)
            ->assertJsonPath('agentId', $agent->id)
            ->assertJsonPath('circuitBreakerActive', true);

        $agent->refresh();
        $this->assertTrue($agent->circuit_breaker_active);

        // Toggle OFF
        $toggleResponse2 = $this->actingAs($this->user)
            ->postJson("/api/agents/{$agent->id}/circuit-break");

        $toggleResponse2->assertStatus(200)
            ->assertJsonPath('circuitBreakerActive', false);
    }

    // -------------------------------------------------------------------------
    // Approvals (admin route)
    // -------------------------------------------------------------------------

    public function test_approve_decision_transitions_intent_to_approved(): void
    {
        $agent  = $this->createAgent();
        $policy = Policy::create([
            'agent_id'                => $agent->id,
            'spend_limit_per_tx_usd'  => 10000,
            'spend_limit_per_day_usd' => 100000,
            'require_approval_above_usd' => 5.0,
            'is_active'               => true,
            'version'                 => 1,
        ]);

        // Create an intent in approval_pending status
        $intent = TxIntent::create([
            'id'                    => Str::uuid(),
            'agent_id'              => $agent->id,
            'policy_id'             => $policy->id,
            'intent_hash'           => '0x' . str_repeat('aa', 32),
            'chain_id'              => self::CHAIN_ID,
            'nonce'                 => 0,
            'to_address'            => self::USDC_ADDRESS,
            'calldata'              => '0x',
            'value_wei'             => '0',
            'gas_limit'             => '100000',
            'max_fee_per_gas'       => '1000000000',
            'max_priority_fee_per_gas' => '1000000000',
            'tx_type'               => 2,
            'access_list'           => [],
            'status'                => TxIntent::STATUS_APPROVAL_PENDING,
            'expires_at'            => now()->addHour(),
        ]);

        // Create corresponding approval queue entry
        $approval = ApprovalQueue::create([
            'id'         => Str::uuid(),
            'intent_id'  => $intent->id,
            'agent_id'   => $agent->id,
            'status'     => ApprovalQueue::STATUS_PENDING,
            'expires_at' => now()->addHour(),
        ]);

        $response = $this->actingAs($this->user)
            ->postJson("/api/approvals/{$approval->id}/decide", [
                'decision' => 'approved',
                'note'     => 'Looks good',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('approvalId', $approval->id)
            ->assertJsonPath('intentId', $intent->id)
            ->assertJsonPath('decision', 'approved')
            ->assertJsonPath('intentStatus', TxIntent::STATUS_APPROVED);

        $this->assertDatabaseHas('tx_intents', [
            'id'     => $intent->id,
            'status' => TxIntent::STATUS_APPROVED,
        ]);

        $this->assertDatabaseHas('approval_queues', [
            'id'     => $approval->id,
            'status' => ApprovalQueue::STATUS_APPROVED,
        ]);
    }
}
