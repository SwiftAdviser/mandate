<?php

namespace Tests\Feature;

use App\Models\Agent;
use App\Models\Policy;
use App\Models\TxIntent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OnboardingTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_returns_needs_onboarding_with_query_param(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/dashboard?onboarding=1');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Dashboard')
            ->where('needs_onboarding', true)
        );
    }

    public function test_dashboard_no_onboarding_without_query_param(): void
    {
        $user = User::factory()->create();
        $agent = Agent::create([
            'name' => 'FreshAgent',
            'evm_address' => '0xabcdef1234567890abcdef1234567890abcdef12',
            'user_id' => $user->id,
            'claimed_at' => now(),
        ]);

        Policy::create([
            'agent_id' => $agent->id,
            'spend_limit_per_tx_usd' => 100,
            'spend_limit_per_day_usd' => 1000,
            'is_active' => true,
        ]);

        $response = $this->actingAs($user)->get('/dashboard');

        $response->assertInertia(fn ($page) => $page
            ->component('Dashboard')
            ->where('needs_onboarding', false)
        );
    }

    public function test_dashboard_no_onboarding_for_old_agent(): void
    {
        $user = User::factory()->create();
        $agent = Agent::create([
            'name' => 'OldAgent',
            'evm_address' => '0xabcdef1234567890abcdef1234567890abcdef12',
            'user_id' => $user->id,
            'claimed_at' => now()->subHour(),
        ]);

        Policy::create([
            'agent_id' => $agent->id,
            'spend_limit_per_tx_usd' => 100,
            'spend_limit_per_day_usd' => 1000,
            'is_active' => true,
            'guard_rules' => 'some rules',
        ]);

        $response = $this->actingAs($user)->get('/dashboard');

        $response->assertInertia(fn ($page) => $page
            ->component('Dashboard')
            ->where('needs_onboarding', false)
        );
    }

    public function test_demo_intent_creates_blocked_intent(): void
    {
        $user = User::factory()->create();
        $agent = Agent::create([
            'name' => 'DemoAgent',
            'evm_address' => '0xabcdef1234567890abcdef1234567890abcdef12',
            'user_id' => $user->id,
            'claimed_at' => now(),
        ]);
        $policy = Policy::create([
            'agent_id' => $agent->id,
            'spend_limit_per_tx_usd' => 100,
            'spend_limit_per_day_usd' => 1000,
            'is_active' => true,
        ]);

        $response = $this->actingAs($user)->postJson("/api/agents/{$agent->id}/demo-intent");

        $response->assertStatus(201)
            ->assertJsonStructure(['intentId', 'status', 'scanResult' => ['pattern_id', 'explanation']]);

        $this->assertDatabaseHas('tx_intents', [
            'agent_id' => $agent->id,
            'block_reason' => 'guard_injection_detected',
            'risk_level' => 'CRITICAL',
        ]);
    }

    public function test_demo_intent_requires_auth(): void
    {
        $response = $this->postJson('/api/agents/some-id/demo-intent');

        $response->assertStatus(401);
    }

    public function test_demo_intent_rate_limited(): void
    {
        $user = User::factory()->create();
        $agent = Agent::create([
            'name' => 'RateLimitAgent',
            'evm_address' => '0xabcdef1234567890abcdef1234567890abcdef12',
            'user_id' => $user->id,
            'claimed_at' => now(),
        ]);
        $policy = Policy::create([
            'agent_id' => $agent->id,
            'spend_limit_per_tx_usd' => 100,
            'spend_limit_per_day_usd' => 1000,
            'is_active' => true,
        ]);

        // Create 5 existing demo intents
        for ($i = 0; $i < 5; $i++) {
            TxIntent::create([
                'agent_id' => $agent->id,
                'policy_id' => $policy->id,
                'status' => TxIntent::STATUS_FAILED,
                'block_reason' => 'guard_injection_detected',
                'to_address' => '0xdead000000000000000000000000000000000000',
                'chain_id' => 84532,
                'nonce' => $i,
                'calldata' => '0x',
                'value_wei' => '0',
                'gas_limit' => '0x0',
                'max_fee_per_gas' => '0x0',
                'max_priority_fee_per_gas' => '0x0',
                'intent_hash' => '0x'.str_pad(dechex($i + 1), 64, '0', STR_PAD_LEFT),
            ]);
        }

        $response = $this->actingAs($user)->postJson("/api/agents/{$agent->id}/demo-intent");

        $response->assertStatus(429);
    }

    public function test_agent_creation_without_address_and_chain(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/agents/create', [
            'name' => 'NameOnlyAgent',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['agentId', 'runtimeKey']);

        $this->assertDatabaseHas('agents', [
            'name' => 'NameOnlyAgent',
            'user_id' => $user->id,
            'evm_address' => null,
            'chain_id' => null,
        ]);
    }

    public function test_login_redirect_preserves_claim_url(): void
    {
        $response = $this->get('/login?redirect=/claim?code=TESTCODE');

        $response->assertStatus(200);
        $response->assertSessionHas('url.intended', '/claim?code=TESTCODE');
    }

    public function test_agent_registration_without_chain_id(): void
    {
        $response = $this->postJson('/api/agents/register', [
            'name' => 'NoChainAgent',
            'evmAddress' => '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['agentId', 'runtimeKey', 'claimUrl']);

        $this->assertDatabaseHas('agents', [
            'name' => 'NoChainAgent',
            'chain_id' => null,
        ]);
    }
}
