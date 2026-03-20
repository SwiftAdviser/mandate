<?php

namespace Tests\Feature;

use App\Models\Agent;
use App\Models\Policy;
use App\Models\PolicyInsight;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class InsightApiTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Agent $agent;
    private Policy $policy;

    protected function setUp(): void
    {
        parent::setUp();
        Http::preventStrayRequests();
        Http::fake(['*' => Http::response([], 200)]);

        $this->user = User::factory()->create();
        $this->agent = Agent::create([
            'name'        => 'TestAgent',
            'evm_address' => '0xabcdef1234567890abcdef1234567890abcdef12',
            'chain_id'    => 84532,
            'user_id'     => $this->user->id,
        ]);
        $this->policy = Policy::create([
            'agent_id'               => $this->agent->id,
            'spend_limit_per_tx_usd' => 100,
            'is_active'              => true,
            'version'                => 1,
        ]);
    }

    private function createInsight(array $overrides = []): PolicyInsight
    {
        return PolicyInsight::create(array_merge([
            'agent_id'       => $this->agent->id,
            'insight_type'   => PolicyInsight::TYPE_ADD_TO_ALLOWLIST,
            'status'         => PolicyInsight::STATUS_ACTIVE,
            'confidence'     => 0.7,
            'evidence_count' => 3,
            'evidence'       => [],
            'suggestion'     => ['field' => 'allowed_addresses', 'action' => 'add', 'value' => '0xabc'],
            'title'          => 'Add 0xabc to allowlist',
            'description'    => 'You approved 3 transfers.',
        ], $overrides));
    }

    // ── GET /api/insights ───────────────────────────────────────────────────

    /** @test */
    public function list_insights_returns_active_only(): void
    {
        $this->createInsight();
        $this->createInsight(['status' => PolicyInsight::STATUS_DISMISSED, 'title' => 'dismissed']);

        $response = $this->actingAs($this->user)->getJson('/api/insights');

        $response->assertOk();
        $response->assertJsonCount(1, 'insights');
        $response->assertJsonPath('insights.0.title', 'Add 0xabc to allowlist');
    }

    /** @test */
    public function list_insights_requires_auth(): void
    {
        $this->getJson('/api/insights')->assertUnauthorized();
    }

    /** @test */
    public function list_insights_excludes_other_users_agents(): void
    {
        $otherUser  = User::factory()->create();
        $otherAgent = Agent::create([
            'name' => 'Other', 'evm_address' => '0x1234', 'chain_id' => 1, 'user_id' => $otherUser->id,
        ]);
        PolicyInsight::create([
            'agent_id' => $otherAgent->id, 'insight_type' => PolicyInsight::TYPE_ADD_TO_ALLOWLIST,
            'status' => PolicyInsight::STATUS_ACTIVE, 'confidence' => 0.7,
            'evidence_count' => 3, 'evidence' => [], 'suggestion' => [],
            'title' => 'not mine', 'description' => 'x',
        ]);

        $response = $this->actingAs($this->user)->getJson('/api/insights');

        $response->assertOk();
        $response->assertJsonCount(0, 'insights');
    }

    // ── POST /api/insights/{id}/accept ──────────────────────────────────────

    /** @test */
    public function accept_insight_creates_new_policy(): void
    {
        $insight = $this->createInsight();

        $response = $this->actingAs($this->user)->postJson("/api/insights/{$insight->id}/accept");

        $response->assertOk();
        $response->assertJsonPath('status', 'accepted');

        $insight->refresh();
        $this->assertSame(PolicyInsight::STATUS_ACCEPTED, $insight->status);
        $this->assertNotNull($insight->policy_id);
    }

    /** @test */
    public function accept_already_dismissed_returns_409(): void
    {
        $insight = $this->createInsight(['status' => PolicyInsight::STATUS_DISMISSED]);

        $response = $this->actingAs($this->user)->postJson("/api/insights/{$insight->id}/accept");

        $response->assertStatus(409);
    }

    // ── POST /api/insights/{id}/dismiss ─────────────────────────────────────

    /** @test */
    public function dismiss_insight_marks_dismissed(): void
    {
        $insight = $this->createInsight();

        $response = $this->actingAs($this->user)->postJson("/api/insights/{$insight->id}/dismiss");

        $response->assertOk();
        $response->assertJsonPath('status', 'dismissed');
    }
}
