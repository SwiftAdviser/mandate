<?php

/**
 * E2E / Integration tests — complete user journeys through the full HTTP stack.
 */

namespace Tests\Integration;

use App\Console\Commands\ReconcileIntents;
use App\Models\Agent;
use App\Models\Policy;
use App\Models\TokenRegistry;
use App\Models\TxIntent;
use App\Models\User;
use App\Services\IntentStateMachineService;
use App\Services\QuotaManagerService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Tests\TestCase;

class UserJourneyTest extends TestCase
{
    use RefreshDatabase;

    private const USDC  = '0x036cbd53842c5426634e7929541ec2318f3dcf7e';
    private const CHAIN = 84532;

    // ERC20 transfer(0xabcdef...ef12, 10_000_000) → $10.00 (stable, 6 dec)
    private const TRANSFER_CALLDATA = '0xa9059cbb000000000000000000000000abcdef1234567890abcdef1234567890abcdef120000000000000000000000000000000000000000000000000000000000989680';

    // ERC20 approve(...) — NOT spend-bearing
    private const APPROVE_CALLDATA  = '0x095ea7b3000000000000000000000000abcdef1234567890abcdef1234567890abcdef120000000000000000000000000000000000000000000000000000000000989680';

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Computes the intentHash the same way PolicyEngineService does. */
    private function intentHash(array $p): string
    {
        $packed = implode('|', [
            $p['chainId'], $p['nonce'],
            strtolower($p['to']),
            strtolower($p['calldata'] ?? '0x'),
            $p['valueWei'] ?? '0',
            $p['gasLimit'],
            $p['maxFeePerGas'],
            $p['maxPriorityFeePerGas'],
            $p['txType'] ?? 2,
            json_encode($p['accessList'] ?? []),
        ]);
        return '0x' . \kornrunner\Keccak::hash($packed, 256);
    }

    /** Build a valid payload with correct intentHash. */
    private function payload(array $overrides = []): array
    {
        $base = [
            'chainId'              => self::CHAIN,
            'nonce'                => 0,
            'to'                   => self::USDC,
            'calldata'             => self::APPROVE_CALLDATA,
            'valueWei'             => '0',
            'gasLimit'             => '100000',
            'maxFeePerGas'         => '1000000000',
            'maxPriorityFeePerGas' => '1000000000',
            'txType'               => 2,
            'accessList'           => [],
            'reason'               => 'Test payment for integration test',
        ];
        $merged = array_merge($base, $overrides);
        $merged['intentHash'] = $this->intentHash($merged);
        return $merged;
    }

    private function register(array $extra = []): array
    {
        $resp = $this->postJson('/api/agents/register', array_merge([
            'name'       => 'TestAgent',
            'evmAddress' => '0x' . bin2hex(random_bytes(20)),
            'chainId'    => self::CHAIN,
        ], $extra));
        $resp->assertStatus(201);
        return $resp->json();
    }

    private function authHeader(string $key): array
    {
        return ['Authorization' => "Bearer $key"];
    }

    protected function setUp(): void
    {
        parent::setUp();

        Http::preventStrayRequests();
        Http::fake([
            '*' => Http::response([
                'data' => [['prices' => [['value' => '1.00']]]],
            ], 200),
        ]);

        config(['mandate.reputation.enabled' => false]);

        TokenRegistry::create([
            'chain_id'  => self::CHAIN,
            'address'   => self::USDC,
            'symbol'    => 'USDC',
            'decimals'  => 6,
            'is_stable' => true,
        ]);
    }

    // ── E2E 1: Full happy-path journey ────────────────────────────────────────

    public function test_full_register_validate_broadcast_reconcile_flow(): void
    {
        Queue::fake();

        // Step 1: Register
        $reg = $this->register();
        $runtimeKey = $reg['runtimeKey'];
        $h = $this->authHeader($runtimeKey);

        // Step 2: Validate (approve calldata)
        $validateResp = $this->withHeaders($h)->postJson('/api/validate', $this->payload());
        $validateResp->assertStatus(200)->assertJsonPath('allowed', true);
        $intentId = $validateResp->json('intentId');
        $this->assertNotNull($intentId);

        // Step 3: GET status → reserved
        $this->withHeaders($h)->getJson("/api/intents/$intentId/status")
            ->assertStatus(200)->assertJsonPath('status', 'reserved');

        // Step 4: Post txHash → broadcasted
        $txHash = '0x' . str_repeat('ff', 32);
        $this->withHeaders($h)->postJson("/api/intents/$intentId/events", ['txHash' => $txHash])
            ->assertStatus(200)->assertJsonPath('status', 'broadcasted');

        // Step 5: Status → broadcasted
        $this->withHeaders($h)->getJson("/api/intents/$intentId/status")
            ->assertStatus(200)->assertJsonPath('status', 'broadcasted');

        // Step 6: Simulate on-chain confirmation
        TxIntent::where('id', $intentId)->update([
            'status'       => TxIntent::STATUS_CONFIRMED,
            'block_number' => '1000',
            'gas_used'     => '21000',
        ]);

        $this->withHeaders($h)->getJson("/api/intents/$intentId/status")
            ->assertStatus(200)->assertJsonPath('status', 'confirmed');
    }

    // ── E2E 2: Quota exhaustion and release ───────────────────────────────────

    public function test_daily_quota_exhaustion_and_release(): void
    {
        Queue::fake();

        // Agent with $15/day — one $10 transfer passes, second blocked
        $reg = $this->register(['defaultPolicy' => [
            'spendLimitPerTxUsd'  => 100,
            'spendLimitPerDayUsd' => 15,
        ]]);
        $agentId    = $reg['agentId'];
        $runtimeKey = $reg['runtimeKey'];
        $h = $this->authHeader($runtimeKey);

        // First $10 intent — should pass
        $p1 = $this->payload(['calldata' => self::TRANSFER_CALLDATA, 'nonce' => 0]);
        $this->withHeaders($h)->postJson('/api/validate', $p1)
            ->assertStatus(200)->assertJsonPath('allowed', true);

        // Second $10 intent — daily limit exceeded
        $p2 = $this->payload(['calldata' => self::TRANSFER_CALLDATA, 'nonce' => 1]);
        $resp = $this->withHeaders($h)->postJson('/api/validate', $p2);
        $resp->assertStatus(422);
        $this->assertStringContainsString('daily', $resp->json('blockReason'));

        // Expire the first intent (TTL expired) → quota released
        $staleIntent = TxIntent::where('agent_id', $agentId)->first();
        $staleIntent->update(['expires_at' => now()->subMinute()]);
        app(IntentStateMachineService::class)
            ->transition($staleIntent, TxIntent::STATUS_EXPIRED, 'system', 'system', ['reason' => 'TTL']);

        // Now $10 intent should pass again
        $p3 = $this->payload(['calldata' => self::TRANSFER_CALLDATA, 'nonce' => 2]);
        $this->withHeaders($h)->postJson('/api/validate', $p3)
            ->assertStatus(200)->assertJsonPath('allowed', true);
    }

    // ── E2E 3: Approval flow ──────────────────────────────────────────────────

    public function test_approval_required_then_approved_flow(): void
    {
        Queue::fake();

        $reg = $this->register();
        $agentId    = $reg['agentId'];
        $runtimeKey = $reg['runtimeKey'];
        $h = $this->authHeader($runtimeKey);

        // Link agent to a user for admin endpoints
        $user = User::factory()->create();
        Agent::where('id', $agentId)->update(['user_id' => $user->id]);

        // Require approval above $5 (our $10 transfer triggers it)
        Policy::where('agent_id', $agentId)->update(['require_approval_above_usd' => 5.00]);

        // Validate transfer → requiresApproval=true
        $resp = $this->withHeaders($h)->postJson('/api/validate', $this->payload([
            'calldata' => self::TRANSFER_CALLDATA,
        ]));
        $resp->assertStatus(200)->assertJsonPath('requiresApproval', true);
        $intentId  = $resp->json('intentId');
        $approvalId = $resp->json('approvalId');
        $this->assertNotNull($approvalId);

        // Status → approval_pending
        $this->withHeaders($h)->getJson("/api/intents/$intentId/status")
            ->assertStatus(200)->assertJsonPath('status', 'approval_pending');

        // Admin approves
        $this->actingAs($user)
            ->postJson("/api/approvals/$approvalId/decide", ['decision' => 'approved', 'note' => 'OK'])
            ->assertStatus(200)
            ->assertJsonPath('decision', 'approved')
            ->assertJsonPath('intentStatus', TxIntent::STATUS_APPROVED);

        // Status → approved
        $this->withHeaders($h)->getJson("/api/intents/$intentId/status")
            ->assertStatus(200)->assertJsonPath('status', 'approved');
    }

    // ── E2E 4: Circuit breaker trip and reset ─────────────────────────────────

    public function test_circuit_breaker_trip_and_reset_journey(): void
    {
        Queue::fake();

        $reg = $this->register();
        $agentId    = $reg['agentId'];
        $runtimeKey = $reg['runtimeKey'];
        $h = $this->authHeader($runtimeKey);

        // Link agent to a user for admin endpoints
        $user = User::factory()->create();
        Agent::where('id', $agentId)->update(['user_id' => $user->id]);

        // Validate passes initially
        $this->withHeaders($h)->postJson('/api/validate', $this->payload(['nonce' => 0]))
            ->assertStatus(200)->assertJsonPath('allowed', true);

        // Trip circuit breaker (toggle: false → true)
        $this->actingAs($user)
            ->postJson("/api/agents/$agentId/circuit-break")
            ->assertStatus(200)->assertJsonPath('circuitBreakerActive', true);

        // Validate blocked (403)
        $this->withHeaders($h)->postJson('/api/validate', $this->payload(['nonce' => 1]))
            ->assertStatus(403);

        // Reset circuit breaker (toggle: true → false)
        $this->actingAs($user)
            ->postJson("/api/agents/$agentId/circuit-break")
            ->assertStatus(200)->assertJsonPath('circuitBreakerActive', false);

        // Validate passes again
        $this->withHeaders($h)->postJson('/api/validate', $this->payload(['nonce' => 1]))
            ->assertStatus(200)->assertJsonPath('allowed', true);
    }

    // ── E2E 5: Reconciler expiry ──────────────────────────────────────────────

    public function test_reconciler_expires_stale_reserved_intents(): void
    {
        Queue::fake();

        $reg = $this->register();
        $agentId    = $reg['agentId'];
        $runtimeKey = $reg['runtimeKey'];
        $h = $this->authHeader($runtimeKey);

        // Validate → reserved intent
        $resp = $this->withHeaders($h)->postJson('/api/validate', $this->payload());
        $resp->assertStatus(200);
        $intentId = $resp->json('intentId');

        // Fast-forward TTL
        TxIntent::where('id', $intentId)->update(['expires_at' => now()->subMinute()]);

        // Run reconciler
        Artisan::call(ReconcileIntents::class);

        // Intent should be expired
        $this->withHeaders($h)->getJson("/api/intents/$intentId/status")
            ->assertStatus(200)->assertJsonPath('status', 'expired');

        // Quota back to 0 (approve is not spend-bearing, so no quota was reserved)
        $reservation = DB::table('quota_reservations')
            ->where('agent_id', $agentId)->where('window_type', 'daily')->first();
        $this->assertNull($reservation);
    }

    // ── E2E 6: Auth enforcement ───────────────────────────────────────────────

    public function test_auth_enforcement_across_protected_endpoints(): void
    {
        $fakeId = Str::uuid()->toString();
        $endpoints = [
            ['POST', '/api/validate',                       ['chainId' => 1]],
            ['POST', "/api/intents/$fakeId/events",        ['txHash' => '0x' . str_repeat('aa', 32)]],
            ['GET',  "/api/intents/$fakeId/status",        null],
        ];

        foreach ($endpoints as [$method, $path, $body]) {
            $resp = $body ? $this->json($method, $path, $body) : $this->json($method, $path);
            $resp->assertStatus(401, "Expected 401 for $method $path without auth");
        }
    }

    // ── E2E 7: Idempotency ────────────────────────────────────────────────────

    public function test_validate_idempotency_on_duplicate_intent_hash(): void
    {
        Queue::fake();

        $reg = $this->register();
        $h = $this->authHeader($reg['runtimeKey']);
        $p = $this->payload();

        $r1 = $this->withHeaders($h)->postJson('/api/validate', $p)->assertStatus(200);
        $r2 = $this->withHeaders($h)->postJson('/api/validate', $p)->assertStatus(200);

        $this->assertSame($r1->json('intentId'), $r2->json('intentId'));
    }

    // ── E2E 8: Claim URL ──────────────────────────────────────────────────────

    public function test_claim_code_is_generated_and_stored_on_registration(): void
    {
        $resp = $this->postJson('/api/agents/register', [
            'name'       => 'ClaimAgent',
            'evmAddress' => '0x' . bin2hex(random_bytes(20)),
            'chainId'    => self::CHAIN,
        ])->assertStatus(201);

        // claimUrl is returned and contains a valid code
        $claimUrl = $resp->json('claimUrl');
        $this->assertStringContainsString('?code=', $claimUrl);
        $claimCode = last(explode('=', $claimUrl));
        $this->assertMatchesRegularExpression('/^[A-Z0-9]{8}$/', $claimCode);

        // The code is stored in the DB on the agent row
        $this->assertDatabaseHas('agents', ['claim_code' => $claimCode, 'claimed_at' => null]);
    }
}
