<?php

namespace Tests\Feature;

use App\Models\Agent;
use App\Models\SkillHeartbeat;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class HeartbeatDashboardTest extends TestCase
{
    use RefreshDatabase;

    private User $adminUser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->adminUser = User::factory()->create();
        config(['mandate.admin_user_id' => $this->adminUser->id]);
    }

    public function test_heartbeats_page_returns_ok_for_admin(): void
    {
        $response = $this->actingAs($this->adminUser)->get('/heartbeats');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->component('Heartbeats'));
    }

    public function test_heartbeats_page_returns_403_for_non_admin(): void
    {
        $regularUser = User::factory()->create();

        $response = $this->actingAs($regularUser)->get('/heartbeats');

        $response->assertForbidden();
    }

    public function test_heartbeats_page_returns_correct_data_shape(): void
    {
        $agent = Agent::create([
            'id' => Str::uuid(),
            'name' => 'TestAgent',
            'wallet_address' => '0xabcdef1234567890abcdef1234567890abcdef12',
            'chain_id' => '84532',
            'user_id' => $this->adminUser->id,
        ]);

        // Seed some heartbeats
        SkillHeartbeat::create(['agent_id' => $agent->id, 'ip' => '10.0.0.1', 'skill_version' => '1.2.0']);
        SkillHeartbeat::create(['agent_id' => null, 'ip' => '10.0.0.2', 'skill_version' => '1.2.0']);
        SkillHeartbeat::create(['agent_id' => $agent->id, 'ip' => '10.0.0.1', 'skill_version' => '1.2.0']);

        $response = $this->actingAs($this->adminUser)->get('/heartbeats');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Heartbeats')
            ->has('daily_counts')
            ->has('totals')
            ->has('top_agents')
            ->where('totals.today', 3)
            ->where('totals.keyed_today', 2)
            ->where('totals.anonymous_today', 1)
        );
    }

    public function test_heartbeats_requires_authentication(): void
    {
        $response = $this->get('/heartbeats');

        $response->assertRedirect('/login');
    }
}
