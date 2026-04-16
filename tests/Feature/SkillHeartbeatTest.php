<?php

namespace Tests\Feature;

use App\Models\Agent;
use App\Models\AgentApiKey;
use App\Models\SkillHeartbeat;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class SkillHeartbeatTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    private function createAgent(array $overrides = []): Agent
    {
        return Agent::create(array_merge([
            'id' => Str::uuid(),
            'name' => 'TestAgent',
            'wallet_address' => '0xabcdef1234567890abcdef1234567890abcdef12',
            'chain_id' => '84532',
            'user_id' => $this->user->id,
        ], $overrides));
    }

    private function issueRuntimeKey(Agent $agent): string
    {
        [$rawKey] = AgentApiKey::generate($agent);

        return $rawKey;
    }

    // ── Model tests ─────────────────────────────────────────────────────────

    public function test_skill_heartbeat_table_exists(): void
    {
        $this->assertTrue(
            \Illuminate\Support\Facades\Schema::hasTable('skill_heartbeats')
        );
    }

    public function test_skill_heartbeat_can_be_created(): void
    {
        $heartbeat = SkillHeartbeat::create([
            'ip' => '127.0.0.1',
            'user_agent' => 'test-agent/1.0',
            'skill_version' => '1.2.0',
        ]);

        $this->assertDatabaseHas('skill_heartbeats', [
            'id' => $heartbeat->id,
            'agent_id' => null,
            'ip' => '127.0.0.1',
            'skill_version' => '1.2.0',
        ]);
    }

    public function test_skill_heartbeat_with_agent_id(): void
    {
        $agent = $this->createAgent();

        $heartbeat = SkillHeartbeat::create([
            'agent_id' => $agent->id,
            'ip' => '10.0.0.1',
            'skill_version' => '1.2.0',
        ]);

        $this->assertDatabaseHas('skill_heartbeats', [
            'agent_id' => $agent->id,
            'ip' => '10.0.0.1',
        ]);
    }

    // ── Endpoint tests ──────────────────────────────────────────────────────

    public function test_skill_md_returns_markdown_content(): void
    {
        $response = $this->get('/skill.md');

        $response->assertOk();
        $response->assertHeader('Content-Type', 'text/markdown; charset=utf-8');
        $response->assertHeader('X-Skill-Version');
        $this->assertStringContains('mandate', $response->getContent());
    }

    public function test_skill_md_logs_anonymous_heartbeat(): void
    {
        $this->get('/skill.md');

        $this->assertDatabaseCount('skill_heartbeats', 1);
        $this->assertDatabaseHas('skill_heartbeats', [
            'agent_id' => null,
        ]);
    }

    public function test_skill_md_logs_keyed_heartbeat(): void
    {
        $agent = $this->createAgent();
        $key = $this->issueRuntimeKey($agent);

        $this->get('/skill.md', ['Authorization' => "Bearer {$key}"]);

        $this->assertDatabaseCount('skill_heartbeats', 1);
        $this->assertDatabaseHas('skill_heartbeats', [
            'agent_id' => $agent->id,
        ]);
    }

    public function test_skill_md_version_header_matches_frontmatter(): void
    {
        $response = $this->get('/skill.md');

        $version = $response->headers->get('X-Skill-Version');
        $this->assertNotNull($version);
        $this->assertMatchesRegularExpression('/^\d+\.\d+\.\d+$/', $version);
    }

    // ── Helper ───────────────────────────────────────────────────────────────

    private function assertStringContains(string $needle, string $haystack): void
    {
        $this->assertTrue(
            str_contains($haystack, $needle),
            "Failed asserting that string contains '{$needle}'."
        );
    }
}
