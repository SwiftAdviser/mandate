<?php

namespace Tests\Unit;

use App\Models\Agent;
use App\Models\Policy;
use App\Models\TxIntent;
use App\Services\IntentStateMachineService;
use App\Services\QuotaManagerService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class IntentStateMachineServiceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Http::preventStrayRequests();
        Http::fake(['*' => Http::response([], 200)]);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function createAgentWithPolicy(array $policyOverrides = []): array
    {
        $agent = Agent::create([
            'id' => Str::uuid(),
            'name' => 'TestAgent',
            'wallet_address' => '0xabcdef1234567890abcdef1234567890abcdef12',
            'chain_id' => '84532',
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

    private function createIntent(
        Agent $agent,
        Policy $policy,
        string $status = TxIntent::STATUS_RESERVED,
        array $overrides = []
    ): TxIntent {
        return TxIntent::create(array_merge([
            'id' => Str::uuid(),
            'agent_id' => $agent->id,
            'policy_id' => $policy->id,
            'intent_hash' => '0x'.bin2hex(random_bytes(32)),
            'chain_id' => '84532',
            'nonce' => 0,
            'to_address' => '0x1234567890123456789012345678901234567890',
            'calldata' => '0x',
            'value_wei' => '0',
            'gas_limit' => '100000',
            'max_fee_per_gas' => '1000000000',
            'max_priority_fee_per_gas' => '1000000000',
            'tx_type' => 2,
            'access_list' => '[]',
            'status' => $status,
            'amount_usd_computed' => 10.0,
            'expires_at' => now()->addMinutes(15),
        ], $overrides));
    }

    private function service(): IntentStateMachineService
    {
        return app(IntentStateMachineService::class);
    }

    // -------------------------------------------------------------------------
    // Tests
    // -------------------------------------------------------------------------

    /** @test */
    public function it_transitions_from_reserved_to_broadcasted(): void
    {
        [$agent, $policy] = $this->createAgentWithPolicy();
        $intent = $this->createIntent($agent, $policy, TxIntent::STATUS_RESERVED);

        $updated = $this->service()->transition(
            $intent,
            TxIntent::STATUS_BROADCASTED,
            $agent->id,
            'agent'
        );

        $this->assertSame(TxIntent::STATUS_BROADCASTED, $updated->status);
        $this->assertDatabaseHas('tx_intents', [
            'id' => $intent->id,
            'status' => TxIntent::STATUS_BROADCASTED,
        ]);
    }

    /** @test */
    public function it_releases_quota_on_failed_transition(): void
    {
        [$agent, $policy] = $this->createAgentWithPolicy();

        // Reserve 10 USD quota before transitioning
        /** @var QuotaManagerService $quota */
        $quota = app(QuotaManagerService::class);
        DB::transaction(fn () => $quota->reserve($agent->id, 10.0));

        $intent = $this->createIntent($agent, $policy, TxIntent::STATUS_BROADCASTED, [
            'amount_usd_computed' => 10.0,
        ]);

        $dailyKey = now()->format('Y-m-d');

        $before = (float) DB::table('quota_reservations')
            ->where('agent_id', $agent->id)
            ->where('window_type', 'daily')
            ->where('window_key', $dailyKey)
            ->value('reserved_usd');

        $this->assertGreaterThan(0.0, $before, 'Quota must be reserved before the test.');

        $this->service()->transition($intent, TxIntent::STATUS_FAILED, $agent->id, 'agent');

        $after = (float) DB::table('quota_reservations')
            ->where('agent_id', $agent->id)
            ->where('window_type', 'daily')
            ->where('window_key', $dailyKey)
            ->value('reserved_usd');

        $this->assertLessThan($before, $after, 'reserved_usd should decrease after release.');
    }

    /** @test */
    public function it_confirms_quota_on_confirmed_transition(): void
    {
        [$agent, $policy] = $this->createAgentWithPolicy();

        /** @var QuotaManagerService $quota */
        $quota = app(QuotaManagerService::class);
        DB::transaction(fn () => $quota->reserve($agent->id, 10.0));

        $intent = $this->createIntent($agent, $policy, TxIntent::STATUS_BROADCASTED, [
            'amount_usd_computed' => 10.0,
        ]);

        $dailyKey = now()->format('Y-m-d');

        $beforeConfirmed = (float) DB::table('quota_reservations')
            ->where('agent_id', $agent->id)
            ->where('window_type', 'daily')
            ->where('window_key', $dailyKey)
            ->value('confirmed_usd');

        $this->service()->transition($intent, TxIntent::STATUS_CONFIRMED, $agent->id, 'agent');

        $afterConfirmed = (float) DB::table('quota_reservations')
            ->where('agent_id', $agent->id)
            ->where('window_type', 'daily')
            ->where('window_key', $dailyKey)
            ->value('confirmed_usd');

        $this->assertGreaterThan($beforeConfirmed, $afterConfirmed, 'confirmed_usd should increase after confirmation.');
    }

    /** @test */
    public function it_appends_tx_event_on_every_transition(): void
    {
        [$agent, $policy] = $this->createAgentWithPolicy();
        $intent = $this->createIntent($agent, $policy, TxIntent::STATUS_RESERVED);

        $this->service()->transition(
            $intent,
            TxIntent::STATUS_BROADCASTED,
            $agent->id,
            'agent',
            ['tx_hash' => '0xdeadbeef']
        );

        $this->assertDatabaseHas('tx_events', [
            'intent_id' => $intent->id,
            'agent_id' => $agent->id,
            'event_type' => TxIntent::STATUS_BROADCASTED,
            'actor_id' => $agent->id,
            'actor_role' => 'agent',
        ]);
    }

    /** @test */
    public function it_expires_stale_reserved_intents(): void
    {
        [$agent, $policy] = $this->createAgentWithPolicy();

        // Create an intent whose TTL has already passed
        $intent = $this->createIntent($agent, $policy, TxIntent::STATUS_RESERVED, [
            'expires_at' => now()->subMinutes(5),
        ]);

        $count = $this->service()->expireStale();

        $this->assertGreaterThanOrEqual(1, $count);
        $this->assertDatabaseHas('tx_intents', [
            'id' => $intent->id,
            'status' => TxIntent::STATUS_EXPIRED,
        ]);
    }

    /** @test */
    public function it_does_not_expire_broadcasted_intents(): void
    {
        [$agent, $policy] = $this->createAgentWithPolicy();

        // Broadcasted intents with null expires_at should be left alone
        $intent = $this->createIntent($agent, $policy, TxIntent::STATUS_BROADCASTED, [
            'expires_at' => null,
        ]);

        $this->service()->expireStale();

        $this->assertDatabaseHas('tx_intents', [
            'id' => $intent->id,
            'status' => TxIntent::STATUS_BROADCASTED,
        ]);
    }
}
