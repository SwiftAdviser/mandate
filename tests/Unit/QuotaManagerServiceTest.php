<?php

namespace Tests\Unit;

use App\Models\Agent;
use App\Models\Policy;
use App\Services\QuotaManagerService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class QuotaManagerServiceTest extends TestCase
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

    private function service(): QuotaManagerService
    {
        return app(QuotaManagerService::class);
    }

    /** Insert a quota row directly so we can seed specific usage values. */
    private function seedQuotaRow(
        string $agentId,
        string $windowType,
        string $windowKey,
        float $reservedUsd,
        float $confirmedUsd = 0.0
    ): void {
        DB::table('quota_reservations')->insertOrIgnore([
            'agent_id' => $agentId,
            'window_type' => $windowType,
            'window_key' => $windowKey,
            'reserved_usd' => $reservedUsd,
            'confirmed_usd' => $confirmedUsd,
            'updated_at' => now(),
        ]);
    }

    // -------------------------------------------------------------------------
    // Tests
    // -------------------------------------------------------------------------

    /** @test */
    public function it_reports_quota_available_when_no_previous_usage(): void
    {
        [$agent, $policy] = $this->createAgentWithPolicy([
            'spend_limit_per_day_usd' => 500,
            'spend_limit_per_month_usd' => 2000,
        ]);

        $result = $this->service()->check($agent->id, $policy, 10.0);

        $this->assertTrue($result['daily_ok']);
        $this->assertTrue($result['monthly_ok']);
        $this->assertSame(0.0, $result['daily_used']);
        $this->assertSame(0.0, $result['monthly_used']);
    }

    /** @test */
    public function it_reports_daily_quota_exceeded_when_at_limit(): void
    {
        [$agent, $policy] = $this->createAgentWithPolicy([
            'spend_limit_per_day_usd' => 100,
        ]);

        $dailyKey = now()->format('Y-m-d');
        $this->seedQuotaRow($agent->id, 'daily', $dailyKey, 100.0);

        // Adding 1 more USD should push it over the 100 limit
        $result = $this->service()->check($agent->id, $policy, 1.0);

        $this->assertFalse($result['daily_ok']);
        $this->assertSame(100.0, $result['daily_used']);
    }

    /** @test */
    public function it_reserves_quota_in_both_daily_and_monthly_windows(): void
    {
        [$agent] = $this->createAgentWithPolicy();

        $dailyKey = now()->format('Y-m-d');
        $monthlyKey = now()->format('Y-m');

        DB::transaction(fn () => $this->service()->reserve($agent->id, 25.0));

        $daily = DB::table('quota_reservations')
            ->where('agent_id', $agent->id)
            ->where('window_type', 'daily')
            ->where('window_key', $dailyKey)
            ->first();

        $monthly = DB::table('quota_reservations')
            ->where('agent_id', $agent->id)
            ->where('window_type', 'monthly')
            ->where('window_key', $monthlyKey)
            ->first();

        $this->assertNotNull($daily);
        $this->assertNotNull($monthly);
        $this->assertEqualsWithDelta(25.0, (float) $daily->reserved_usd, 0.001);
        $this->assertEqualsWithDelta(25.0, (float) $monthly->reserved_usd, 0.001);
    }

    /** @test */
    public function it_releases_quota_without_going_below_zero(): void
    {
        [$agent] = $this->createAgentWithPolicy();

        $dailyKey = now()->format('Y-m-d');
        $monthlyKey = now()->format('Y-m');

        // Seed only 5 USD reserved; release 20 — result must clamp to 0
        $this->seedQuotaRow($agent->id, 'daily', $dailyKey, 5.0);
        $this->seedQuotaRow($agent->id, 'monthly', $monthlyKey, 5.0);

        $this->service()->release($agent->id, 20.0);

        $dailyReserved = (float) DB::table('quota_reservations')
            ->where('agent_id', $agent->id)
            ->where('window_type', 'daily')
            ->where('window_key', $dailyKey)
            ->value('reserved_usd');

        $monthlyReserved = (float) DB::table('quota_reservations')
            ->where('agent_id', $agent->id)
            ->where('window_type', 'monthly')
            ->where('window_key', $monthlyKey)
            ->value('reserved_usd');

        $this->assertEqualsWithDelta(0.0, $dailyReserved, 0.001, 'Daily reserved_usd must not go below zero.');
        $this->assertEqualsWithDelta(0.0, $monthlyReserved, 0.001, 'Monthly reserved_usd must not go below zero.');
    }

    /** @test */
    public function it_confirms_quota_moves_reserved_to_confirmed(): void
    {
        [$agent, $policy] = $this->createAgentWithPolicy();

        $dailyKey = now()->format('Y-m-d');
        $monthlyKey = now()->format('Y-m');

        $this->seedQuotaRow($agent->id, 'daily', $dailyKey, 50.0, 0.0);
        $this->seedQuotaRow($agent->id, 'monthly', $monthlyKey, 50.0, 0.0);

        // Build a minimal TxIntent-like object with the fields confirm() needs
        $intent = new \App\Models\TxIntent([
            'amount_usd_computed' => 15.0,
        ]);
        // confirm() uses $intent->created_at to derive the window keys
        $intent->created_at = now();

        $this->service()->confirm($agent->id, $intent);

        $daily = DB::table('quota_reservations')
            ->where('agent_id', $agent->id)
            ->where('window_type', 'daily')
            ->where('window_key', $dailyKey)
            ->first();

        $monthly = DB::table('quota_reservations')
            ->where('agent_id', $agent->id)
            ->where('window_type', 'monthly')
            ->where('window_key', $monthlyKey)
            ->first();

        // reserved should decrease; confirmed should increase
        $this->assertEqualsWithDelta(35.0, (float) $daily->reserved_usd, 0.001, 'Daily reserved should decrease by 15.');
        $this->assertEqualsWithDelta(15.0, (float) $daily->confirmed_usd, 0.001, 'Daily confirmed should increase by 15.');
        $this->assertEqualsWithDelta(35.0, (float) $monthly->reserved_usd, 0.001, 'Monthly reserved should decrease by 15.');
        $this->assertEqualsWithDelta(15.0, (float) $monthly->confirmed_usd, 0.001, 'Monthly confirmed should increase by 15.');
    }
}
