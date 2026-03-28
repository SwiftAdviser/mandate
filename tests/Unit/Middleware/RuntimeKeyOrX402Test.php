<?php

namespace Tests\Unit\Middleware;

use App\Http\Middleware\RuntimeKeyOrX402;
use App\Models\Agent;
use App\Models\AgentApiKey;
use App\Services\X402FacilitatorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Mockery;
use Tests\TestCase;

class RuntimeKeyOrX402Test extends TestCase
{
    use RefreshDatabase;

    private X402FacilitatorService $facilitator;

    protected function setUp(): void
    {
        parent::setUp();

        $this->facilitator = Mockery::mock(X402FacilitatorService::class);
        $this->app->instance(X402FacilitatorService::class, $this->facilitator);

        config([
            'mandate.x402.enabled' => true,
            'mandate.x402.pay_to' => '0xSeller',
            'mandate.x402.network_id' => '84532',
            'mandate.x402.asset' => '0xUSDC',
            'mandate.x402.prices.validate' => '100000',
        ]);
    }

    private function middleware(): RuntimeKeyOrX402
    {
        return $this->app->make(RuntimeKeyOrX402::class);
    }

    private function createAgentWithKey(): array
    {
        $agent = Agent::create([
            'id' => Str::uuid(),
            'name' => 'TestAgent',
            'wallet_address' => '0xabcdef1234567890abcdef1234567890abcdef12',
            'chain_id' => '84532',
        ]);

        [$rawKey, $keyModel] = AgentApiKey::generate($agent);

        return [$agent, $rawKey, $keyModel];
    }

    private function makeRequest(?string $bearerToken = null, ?string $paymentHeader = null): Request
    {
        $request = Request::create('/api/validate', 'POST');

        if ($bearerToken) {
            $request->headers->set('Authorization', "Bearer {$bearerToken}");
        }

        if ($paymentHeader) {
            $request->headers->set('PAYMENT-SIGNATURE', $paymentHeader);
        }

        return $request;
    }

    private function callMiddleware(Request $request): mixed
    {
        return $this->middleware()->handle($request, fn ($req) => response()->json(['ok' => true]));
    }

    // -------------------------------------------------------------------------

    /** @test */
    public function passes_with_valid_runtime_key(): void
    {
        [$agent, $rawKey] = $this->createAgentWithKey();

        $request = $this->makeRequest(bearerToken: $rawKey);
        $response = $this->callMiddleware($request);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame($agent->id, $request->attributes->get('agent')->id);
        $this->assertNull($request->attributes->get('x402_payment'));
    }

    /** @test */
    public function passes_with_valid_x402_payment(): void
    {
        Queue::fake();

        $paymentData = base64_encode(json_encode(['x402Version' => 2, 'payload' => ['signature' => '0xpayment']]));

        $this->facilitator
            ->shouldReceive('verify')
            ->once()
            ->andReturn(['isValid' => true, 'payer' => '0xPayer']);

        $request = $this->makeRequest(paymentHeader: $paymentData);
        $response = $this->callMiddleware($request);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertTrue($request->attributes->get('x402_payment'));
    }

    /** @test */
    public function returns_402_when_neither_provided(): void
    {
        $request = $this->makeRequest();
        $response = $this->callMiddleware($request);

        $this->assertSame(402, $response->getStatusCode());
        $this->assertNotNull($response->headers->get('PAYMENT-REQUIRED'));
    }

    /** @test */
    public function prefers_runtime_key_when_both_present(): void
    {
        [$agent, $rawKey] = $this->createAgentWithKey();
        $paymentData = base64_encode(json_encode(['x402Version' => 2, 'payload' => ['signature' => '0xpayment']]));

        $request = $this->makeRequest(bearerToken: $rawKey, paymentHeader: $paymentData);
        $response = $this->callMiddleware($request);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame($agent->id, $request->attributes->get('agent')->id);
        $this->assertNull($request->attributes->get('x402_payment'));
    }

    /** @test */
    public function falls_through_to_x402_when_runtime_key_invalid(): void
    {
        Queue::fake();

        $paymentData = base64_encode(json_encode(['x402Version' => 2, 'payload' => ['signature' => '0xpayment']]));

        $this->facilitator
            ->shouldReceive('verify')
            ->once()
            ->andReturn(['isValid' => true, 'payer' => '0xPayer']);

        $request = $this->makeRequest(bearerToken: 'mndt_live_invalid', paymentHeader: $paymentData);
        $response = $this->callMiddleware($request);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertTrue($request->attributes->get('x402_payment'));
    }

    /** @test */
    public function returns_401_when_x402_disabled_and_no_runtime_key(): void
    {
        config(['mandate.x402.enabled' => false]);

        $request = $this->makeRequest();
        $response = $this->callMiddleware($request);

        $this->assertSame(401, $response->getStatusCode());
    }
}
