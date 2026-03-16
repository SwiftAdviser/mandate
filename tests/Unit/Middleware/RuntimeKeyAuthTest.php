<?php

namespace Tests\Unit\Middleware;

use App\Http\Middleware\RuntimeKeyAuth;
use App\Models\Agent;
use App\Models\AgentApiKey;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Tests\TestCase;

class RuntimeKeyAuthTest extends TestCase
{
    use RefreshDatabase;

    private function middleware(): RuntimeKeyAuth
    {
        return new RuntimeKeyAuth();
    }

    private function createAgentWithKey(array $agentOverrides = []): array
    {
        $agent = Agent::create(array_merge([
            'id'          => Str::uuid(),
            'name'        => 'TestAgent',
            'evm_address' => '0xabcdef1234567890abcdef1234567890abcdef12',
            'chain_id'    => 84532,
        ], $agentOverrides));

        [$rawKey, $keyModel] = AgentApiKey::generate($agent);

        return [$agent, $rawKey, $keyModel];
    }

    private function makeRequest(?string $bearerToken = null): Request
    {
        $request = Request::create('/api/validate', 'POST');

        if ($bearerToken) {
            $request->headers->set('Authorization', "Bearer {$bearerToken}");
        }

        return $request;
    }

    private function callMiddleware(Request $request): mixed
    {
        return $this->middleware()->handle($request, fn ($req) => response()->json(['ok' => true]));
    }

    // -------------------------------------------------------------------------
    // Tests
    // -------------------------------------------------------------------------

    /** @test */
    public function it_passes_with_valid_runtime_key(): void
    {
        [$agent, $rawKey] = $this->createAgentWithKey();

        $request  = $this->makeRequest($rawKey);
        $response = $this->callMiddleware($request);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame($agent->id, $request->attributes->get('agent')->id);
        $this->assertNotNull($request->attributes->get('api_key'));
    }

    /** @test */
    public function it_rejects_missing_bearer_token(): void
    {
        $request  = $this->makeRequest(null);
        $response = $this->callMiddleware($request);

        $this->assertSame(401, $response->getStatusCode());
        $this->assertStringContainsString('Missing or invalid', $response->getContent());
    }

    /** @test */
    public function it_rejects_invalid_prefix(): void
    {
        $request  = $this->makeRequest('invalid_prefix_abc123');
        $response = $this->callMiddleware($request);

        $this->assertSame(401, $response->getStatusCode());
    }

    /** @test */
    public function it_rejects_unknown_key_hash(): void
    {
        $request  = $this->makeRequest('mndt_live_thiskeyisnotindatabase');
        $response = $this->callMiddleware($request);

        $this->assertSame(401, $response->getStatusCode());
        $this->assertStringContainsString('Invalid runtime key', $response->getContent());
    }

    /** @test */
    public function it_rejects_revoked_key(): void
    {
        [$agent, $rawKey, $keyModel] = $this->createAgentWithKey();
        $keyModel->update(['revoked_at' => now()]);

        $request  = $this->makeRequest($rawKey);
        $response = $this->callMiddleware($request);

        $this->assertSame(401, $response->getStatusCode());
    }

    /** @test */
    public function it_returns_403_when_circuit_breaker_active(): void
    {
        [$agent, $rawKey] = $this->createAgentWithKey([
            'circuit_breaker_active' => true,
            'circuit_breaker_reason' => 'security_violation',
        ]);

        $request  = $this->makeRequest($rawKey);
        $response = $this->callMiddleware($request);

        $this->assertSame(403, $response->getStatusCode());
        $this->assertStringContainsString('Circuit breaker', $response->getContent());
    }

    /** @test */
    public function it_updates_last_used_at(): void
    {
        [$agent, $rawKey, $keyModel] = $this->createAgentWithKey();
        $this->assertNull($keyModel->last_used_at);

        $this->callMiddleware($this->makeRequest($rawKey));

        $keyModel->refresh();
        $this->assertNotNull($keyModel->last_used_at);
    }

    /** @test */
    public function it_sets_agent_and_api_key_on_request(): void
    {
        [$agent, $rawKey, $keyModel] = $this->createAgentWithKey();

        $request = $this->makeRequest($rawKey);
        $this->callMiddleware($request);

        $this->assertSame($agent->id, $request->attributes->get('agent')->id);
        $this->assertSame($keyModel->id, $request->attributes->get('api_key')->id);
    }

    /** @test */
    public function it_accepts_test_key_prefix(): void
    {
        // Base Sepolia (84532) generates mndt_test_ keys
        [$agent, $rawKey] = $this->createAgentWithKey(['chain_id' => 84532]);
        $this->assertTrue(str_starts_with($rawKey, 'mndt_test_'));

        $request  = $this->makeRequest($rawKey);
        $response = $this->callMiddleware($request);

        $this->assertSame(200, $response->getStatusCode());
    }
}
