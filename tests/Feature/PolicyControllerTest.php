<?php

namespace Tests\Feature;

use App\Models\Agent;
use App\Models\Policy;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class PolicyControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    private function createAgent(): Agent
    {
        return Agent::create([
            'id'          => Str::uuid(),
            'name'        => 'TestAgent',
            'evm_address' => '0xabcdef1234567890abcdef1234567890abcdef12',
            'chain_id'    => 84532,
            'user_id'     => $this->user->id,
        ]);
    }

    // -------------------------------------------------------------------------
    // index
    // -------------------------------------------------------------------------

    /** @test */
    public function index_returns_policies_for_agent(): void
    {
        $agent = $this->createAgent();

        Policy::create([
            'agent_id' => $agent->id, 'spend_limit_per_tx_usd' => 100,
            'is_active' => true, 'version' => 1,
        ]);
        Policy::create([
            'agent_id' => $agent->id, 'spend_limit_per_tx_usd' => 200,
            'is_active' => false, 'version' => 2,
        ]);

        $response = $this->actingAs($this->user)->getJson("/api/agents/{$agent->id}/policies");

        $response->assertOk();
        $response->assertJsonCount(2, 'policies');
    }

    /** @test */
    public function index_returns_404_for_unknown_agent(): void
    {
        $response = $this->actingAs($this->user)->getJson('/api/agents/' . Str::uuid() . '/policies');

        $response->assertNotFound();
    }

    // -------------------------------------------------------------------------
    // store
    // -------------------------------------------------------------------------

    /** @test */
    public function store_creates_new_policy(): void
    {
        $agent = $this->createAgent();

        $response = $this->actingAs($this->user)->postJson("/api/agents/{$agent->id}/policies", [
            'spendLimitPerTxUsd'    => 50.0,
            'spendLimitPerDayUsd'   => 500.0,
            'spendLimitPerMonthUsd' => 5000.0,
            'allowedAddresses'      => ['0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'],
        ]);

        $response->assertCreated();
        $response->assertJsonPath('spend_limit_per_tx_usd', '50.000000');
        $response->assertJsonFragment(['is_active' => true]);
        $response->assertJsonFragment(['version' => 1]);

        $this->assertDatabaseHas('policies', [
            'agent_id'  => $agent->id,
            'is_active' => true,
        ]);
    }

    /** @test */
    public function store_deactivates_previous_active_policy(): void
    {
        $agent = $this->createAgent();

        $first = Policy::create([
            'agent_id' => $agent->id, 'spend_limit_per_tx_usd' => 100,
            'is_active' => true, 'version' => 1,
        ]);

        $this->actingAs($this->user)->postJson("/api/agents/{$agent->id}/policies", [
            'spendLimitPerTxUsd' => 200.0,
        ])->assertCreated();

        $first->refresh();
        $this->assertFalse((bool) $first->is_active);

        // New policy is active
        $active = $agent->activePolicy;
        $this->assertNotNull($active);
        $this->assertSame(2, $active->version);
    }

    /** @test */
    public function store_increments_version(): void
    {
        $agent = $this->createAgent();

        $this->actingAs($this->user)->postJson("/api/agents/{$agent->id}/policies", [
            'spendLimitPerTxUsd' => 10,
        ])->assertCreated();

        $this->actingAs($this->user)->postJson("/api/agents/{$agent->id}/policies", [
            'spendLimitPerTxUsd' => 20,
        ])->assertCreated();

        $this->actingAs($this->user)->postJson("/api/agents/{$agent->id}/policies", [
            'spendLimitPerTxUsd' => 30,
        ])->assertCreated();

        $this->assertSame(3, $agent->policies()->max('version'));
    }

    /** @test */
    public function store_validates_negative_amount(): void
    {
        $agent = $this->createAgent();

        $response = $this->actingAs($this->user)->postJson("/api/agents/{$agent->id}/policies", [
            'spendLimitPerTxUsd' => -10,
        ]);

        $response->assertUnprocessable();
    }

    /** @test */
    public function store_accepts_nullable_fields(): void
    {
        $agent = $this->createAgent();

        $response = $this->actingAs($this->user)->postJson("/api/agents/{$agent->id}/policies", [
            'spendLimitPerTxUsd' => null,
            'allowedAddresses'   => null,
            'schedule'           => null,
        ]);

        $response->assertCreated();
        $response->assertJsonFragment(['spend_limit_per_tx_usd' => null]);
    }

    /** @test */
    public function store_accepts_schedule(): void
    {
        $agent = $this->createAgent();

        $response = $this->actingAs($this->user)->postJson("/api/agents/{$agent->id}/policies", [
            'schedule' => [
                'days'  => ['monday', 'wednesday', 'friday'],
                'hours' => [9, 10, 11, 12, 13, 14, 15, 16, 17],
            ],
        ]);

        $response->assertCreated();
        $this->assertNotNull($response->json('schedule'));
    }

    /** @test */
    public function store_accepts_all_policy_fields(): void
    {
        $agent = $this->createAgent();

        $response = $this->actingAs($this->user)->postJson("/api/agents/{$agent->id}/policies", [
            'spendLimitPerTxUsd'       => 100,
            'spendLimitPerDayUsd'      => 1000,
            'spendLimitPerMonthUsd'    => 10000,
            'allowedAddresses'         => ['0xabc'],
            'allowedContracts'         => ['0xdef'],
            'blockedSelectors'         => ['0xa9059cbb'],
            'requireApprovalSelectors' => ['0x095ea7b3'],
            'requireApprovalAboveUsd'  => 500,
            'maxSlippageBps'           => 50,
            'maxGasLimit'              => '500000',
            'maxValueWei'              => '1000000000000000000',
            'schedule'                 => ['days' => ['monday'], 'hours' => [9]],
        ]);

        $response->assertCreated();
    }

    // -------------------------------------------------------------------------
    // show
    // -------------------------------------------------------------------------

    /** @test */
    public function show_returns_single_policy(): void
    {
        $agent = $this->createAgent();

        $policy = Policy::create([
            'agent_id' => $agent->id, 'spend_limit_per_tx_usd' => 100,
            'is_active' => true, 'version' => 1,
        ]);

        $response = $this->actingAs($this->user)->getJson("/api/agents/{$agent->id}/policies/{$policy->id}");

        $response->assertOk();
        $response->assertJsonPath('spend_limit_per_tx_usd', '100.000000');
    }

    /** @test */
    public function show_returns_404_for_wrong_agent(): void
    {
        $agent  = $this->createAgent();
        $other  = $this->createAgent();

        $policy = Policy::create([
            'agent_id' => $agent->id, 'spend_limit_per_tx_usd' => 100,
            'is_active' => true, 'version' => 1,
        ]);

        // Try to access policy through wrong agent
        $response = $this->actingAs($this->user)->getJson("/api/agents/{$other->id}/policies/{$policy->id}");

        $response->assertNotFound();
    }

    /** @test */
    public function show_returns_404_for_nonexistent_policy(): void
    {
        $agent = $this->createAgent();

        $response = $this->actingAs($this->user)->getJson("/api/agents/{$agent->id}/policies/" . Str::uuid());

        $response->assertNotFound();
    }
}
