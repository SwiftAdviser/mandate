<?php

namespace Tests\Feature;

use App\Models\AgentApiKey;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AgentRegenerateKeyTest extends TestCase
{
    use RefreshDatabase;

    public function test_regenerate_key_returns_new_key(): void
    {
        $user = User::factory()->create();

        $create = $this->actingAs($user)->postJson('/api/agents/create', [
            'name' => 'RegenAgent',
        ]);
        $agentId = $create->json('agentId');
        $oldKey = $create->json('runtimeKey');

        $response = $this->actingAs($user)->postJson("/api/agents/{$agentId}/regenerate-key");

        $response->assertOk()
            ->assertJsonStructure(['runtimeKey']);

        $newKey = $response->json('runtimeKey');
        $this->assertNotEquals($oldKey, $newKey);
        $this->assertStringStartsWith('mndt_', $newKey);
    }

    public function test_old_key_is_revoked_after_regeneration(): void
    {
        $user = User::factory()->create();

        $create = $this->actingAs($user)->postJson('/api/agents/create', [
            'name' => 'RevokeTest',
        ]);
        $agentId = $create->json('agentId');

        $this->actingAs($user)->postJson("/api/agents/{$agentId}/regenerate-key");

        // All previous keys should be revoked
        $activeKeys = AgentApiKey::where('agent_id', $agentId)
            ->whereNull('revoked_at')
            ->count();

        $this->assertEquals(1, $activeKeys);
    }

    public function test_regenerate_key_requires_ownership(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();

        $create = $this->actingAs($owner)->postJson('/api/agents/create', [
            'name' => 'OwnerOnly',
        ]);
        $agentId = $create->json('agentId');

        $response = $this->actingAs($other)->postJson("/api/agents/{$agentId}/regenerate-key");

        $response->assertStatus(403);
    }

    public function test_regenerate_key_requires_auth(): void
    {
        $response = $this->postJson('/api/agents/some-fake-id/regenerate-key');

        $response->assertStatus(401);
    }
}
