<?php

namespace Tests\Unit\Middleware;

use App\Http\Middleware\X402PaymentGate;
use App\Jobs\SettleX402Payment;
use App\Services\X402FacilitatorService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Queue;
use Mockery;
use Tests\TestCase;

class X402PaymentGateTest extends TestCase
{
    private X402FacilitatorService $facilitator;

    protected function setUp(): void
    {
        parent::setUp();

        $this->facilitator = Mockery::mock(X402FacilitatorService::class);
        $this->app->instance(X402FacilitatorService::class, $this->facilitator);

        config([
            'mandate.x402.enabled' => true,
            'mandate.x402.pay_to' => '0xSeller',
            'mandate.x402.network_id' => '8453',
            'mandate.x402.asset' => '0xUSDC',
            'mandate.x402.prices' => [
                'validate' => '100000',
                'preflight' => '50000',
            ],
        ]);
    }

    private function middleware(): X402PaymentGate
    {
        return $this->app->make(X402PaymentGate::class);
    }

    private function makeRequest(string $uri = '/api/validate', ?string $paymentHeader = null): Request
    {
        $request = Request::create($uri, 'POST');

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
    public function returns_402_with_v2_payment_required_header(): void
    {
        $request = $this->makeRequest('/api/validate');
        $response = $this->callMiddleware($request);

        $this->assertSame(402, $response->getStatusCode());

        $header = $response->headers->get('PAYMENT-REQUIRED');
        $this->assertNotNull($header);

        $parsed = json_decode(base64_decode($header), true);
        $this->assertSame(2, $parsed['x402Version']);
        $this->assertCount(1, $parsed['accepts']);
        $this->assertSame('exact', $parsed['accepts'][0]['scheme']);
        $this->assertSame('eip155:8453', $parsed['accepts'][0]['network']);
        $this->assertSame('0xSeller', $parsed['accepts'][0]['payTo']);
        $this->assertSame('100000', $parsed['accepts'][0]['amount']);
    }

    /** @test */
    public function returns_preflight_price_for_preflight_route(): void
    {
        $request = $this->makeRequest('/api/validate/preflight');
        $response = $this->callMiddleware($request);

        $this->assertSame(402, $response->getStatusCode());

        $parsed = json_decode(base64_decode($response->headers->get('PAYMENT-REQUIRED')), true);
        $this->assertSame('50000', $parsed['accepts'][0]['amount']);
    }

    /** @test */
    public function passes_through_when_facilitator_verifies_payment(): void
    {
        Queue::fake();

        $paymentData = base64_encode(json_encode([
            'x402Version' => 2,
            'accepted' => ['scheme' => 'exact', 'network' => 'eip155:8453', 'amount' => '100000'],
            'payload' => ['signature' => '0xpayment'],
        ]));

        $this->facilitator
            ->shouldReceive('verify')
            ->once()
            ->andReturn(['isValid' => true, 'payer' => '0xPayer']);

        $request = $this->makeRequest('/api/validate', $paymentData);
        $response = $this->callMiddleware($request);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertTrue($request->attributes->get('x402_payment'));
        $this->assertSame('0xPayer', $request->attributes->get('x402_payer'));

        Queue::assertPushed(SettleX402Payment::class);
    }

    /** @test */
    public function returns_402_when_facilitator_rejects_payment(): void
    {
        $paymentData = base64_encode(json_encode(['x402Version' => 2, 'payload' => ['signature' => 'bad']]));

        $this->facilitator
            ->shouldReceive('verify')
            ->once()
            ->andReturn(['isValid' => false, 'invalidReason' => 'bad signature']);

        $request = $this->makeRequest('/api/validate', $paymentData);
        $response = $this->callMiddleware($request);

        $this->assertSame(402, $response->getStatusCode());

        $body = json_decode($response->getContent(), true);
        $this->assertSame('bad signature', $body['error']);
    }

    /** @test */
    public function passes_through_when_x402_disabled(): void
    {
        config(['mandate.x402.enabled' => false]);

        $request = $this->makeRequest('/api/validate');
        $response = $this->callMiddleware($request);

        $this->assertSame(200, $response->getStatusCode());
    }

    /** @test */
    public function handles_malformed_payment_header_gracefully(): void
    {
        $request = $this->makeRequest('/api/validate', 'not-base64-or-json!!!');
        $response = $this->callMiddleware($request);

        $this->assertSame(402, $response->getStatusCode());

        $body = json_decode($response->getContent(), true);
        $this->assertStringContainsString('Malformed', $body['error']);
    }
}
