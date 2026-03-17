<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AgentCreateTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_first_agent_creation(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/agents/create', [
            'name'       => 'DashboardAgent',
            'evmAddress' => '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12',
            'chainId'    => 84532,
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['agentId', 'runtimeKey', 'evmAddress', 'chainId']);

        $this->assertDatabaseHas('agents', [
            'name'        => 'DashboardAgent',
            'user_id'     => $user->id,
            'evm_address' => '0xabcdef1234567890abcdef1234567890abcdef12',
        ]);

        // Agent should be pre-claimed
        $agentId = $response->json('agentId');
        $this->assertNotNull(
            \App\Models\Agent::find($agentId)->claimed_at
        );
    }

    public function test_dashboard_agent_creation_requires_auth(): void
    {
        $response = $this->postJson('/api/agents/create', [
            'name'       => 'NoAuthAgent',
            'evmAddress' => '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12',
            'chainId'    => 84532,
        ]);

        $response->assertStatus(401);
    }

    public function test_dashboard_agent_creation_validates_input(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/agents/create', [
            'name'       => '',
            'evmAddress' => 'invalid',
            'chainId'    => 84532,
        ]);

        $response->assertStatus(422);
    }

    public function test_delete_agent(): void
    {
        $user = User::factory()->create();

        // Create agent first
        $createResponse = $this->actingAs($user)->postJson('/api/agents/create', [
            'name'       => 'ToDelete',
            'evmAddress' => '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12',
            'chainId'    => 84532,
        ]);
        $agentId = $createResponse->json('agentId');

        // Delete it
        $response = $this->actingAs($user)->deleteJson("/api/agents/{$agentId}");
        $response->assertOk()->assertJson(['deleted' => true]);

        $this->assertDatabaseMissing('agents', ['id' => $agentId]);
    }

    public function test_delete_agent_requires_ownership(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();

        $createResponse = $this->actingAs($owner)->postJson('/api/agents/create', [
            'name'       => 'OwnedAgent',
            'evmAddress' => '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12',
            'chainId'    => 84532,
        ]);
        $agentId = $createResponse->json('agentId');

        // Other user cannot delete
        $response = $this->actingAs($other)->deleteJson("/api/agents/{$agentId}");
        $response->assertStatus(404);

        $this->assertDatabaseHas('agents', ['id' => $agentId]);
    }

    public function test_delete_agent_requires_auth(): void
    {
        $response = $this->deleteJson('/api/agents/some-fake-id');
        $response->assertStatus(401);
    }
}
