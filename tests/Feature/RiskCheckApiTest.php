<?php

namespace Tests\Feature;

use App\Models\Agent;
use App\Models\AgentApiKey;
use App\Models\Policy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class RiskCheckApiTest extends TestCase
{
    use RefreshDatabase;

    private string $runtimeKey;

    protected function setUp(): void
    {
        parent::setUp();
        Http::preventStrayRequests();

        config([
            'mandate.aegis.enabled' => true,
            'mandate.aegis.api_key' => 'test-key',
            'mandate.aegis.retries' => 0,
        ]);

        $agent = Agent::create([
            'id'          => Str::uuid(),
            'name'        => 'RiskTestAgent',
            'evm_address' => '0xabcdef1234567890abcdef1234567890abcdef12',
            'chain_id'    => 84532,
        ]);

        [$rawKey] = AgentApiKey::generate($agent);
        $this->runtimeKey = $rawKey;

        Policy::create([
            'agent_id'               => $agent->id,
            'spend_limit_per_tx_usd' => 100,
            'is_active'              => true,
            'version'                => 1,
        ]);
    }

    /** @test */
    public function it_returns_risk_assessment_for_valid_request(): void
    {
        Http::fake([
            'https://api.web3antivirus.io/api/public/v1/extension/simulation/*' => Http::response(['detectors' => []]),
            'https://api.web3antivirus.io/api/public/v1/extension/account/*'    => Http::response(['toxic_score' => 10]),
        ]);

        $response = $this->postJson('/api/risk/check', [
            'to'      => '0xabc123abc123abc123abc123abc123abc123abc1',
            'chainId' => 84532,
        ], [
            'Authorization' => "Bearer {$this->runtimeKey}",
        ]);

        $response->assertOk();
        $response->assertJsonStructure(['risk_level', 'degraded', 'warnings', 'toxic_score']);
        $this->assertContains($response->json('risk_level'), ['SAFE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
    }

    /** @test */
    public function it_returns_degraded_when_w3a_is_down(): void
    {
        Http::fake([
            'https://api.web3antivirus.io/*' => Http::response(null, 500),
        ]);

        $response = $this->postJson('/api/risk/check', [
            'to'      => '0xabc123abc123abc123abc123abc123abc123abc1',
            'chainId' => 84532,
        ], [
            'Authorization' => "Bearer {$this->runtimeKey}",
        ]);

        $response->assertOk();
        $this->assertTrue($response->json('degraded'));
    }

    /** @test */
    public function it_requires_authentication(): void
    {
        $response = $this->postJson('/api/risk/check', [
            'to'      => '0xabc123abc123abc123abc123abc123abc123abc1',
            'chainId' => 84532,
        ]);

        $response->assertUnauthorized();
    }

    /** @test */
    public function it_validates_input(): void
    {
        $response = $this->postJson('/api/risk/check', [
            'to' => 'not-an-address',
        ], [
            'Authorization' => "Bearer {$this->runtimeKey}",
        ]);

        $response->assertUnprocessable();
    }
}
