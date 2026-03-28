<?php

namespace Tests\Unit\Services;

use App\Services\X402FacilitatorService;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class X402FacilitatorServiceTest extends TestCase
{
    private function service(): X402FacilitatorService
    {
        return new X402FacilitatorService;
    }

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'mandate.x402.enabled' => true,
            'mandate.x402.facilitator_url' => 'https://facilitator.test',
            'mandate.x402.timeout' => 5,
        ]);
    }

    /** @test */
    public function verify_returns_valid_when_facilitator_accepts(): void
    {
        Http::fake([
            'facilitator.test/verify' => Http::response([
                'isValid' => true,
                'payer' => '0xabc123',
            ]),
        ]);

        $result = $this->service()->verify(
            ['payment' => 'data'],
            ['requirement' => 'data'],
        );

        $this->assertTrue($result['isValid']);
        $this->assertSame('0xabc123', $result['payer']);
    }

    /** @test */
    public function verify_returns_invalid_when_facilitator_rejects(): void
    {
        Http::fake([
            'facilitator.test/verify' => Http::response([
                'isValid' => false,
                'invalidReason' => 'insufficient funds',
            ]),
        ]);

        $result = $this->service()->verify(
            ['payment' => 'bad'],
            ['requirement' => 'data'],
        );

        $this->assertFalse($result['isValid']);
        $this->assertSame('insufficient funds', $result['invalidReason']);
    }

    /** @test */
    public function verify_returns_invalid_on_http_error(): void
    {
        Http::fake([
            'facilitator.test/verify' => Http::response('Server error', 500),
        ]);

        $result = $this->service()->verify(
            ['payment' => 'data'],
            ['requirement' => 'data'],
        );

        $this->assertFalse($result['isValid']);
        $this->assertStringContainsString('Facilitator error', $result['invalidReason']);
    }

    /** @test */
    public function verify_returns_invalid_on_timeout(): void
    {
        Http::fake([
            'facilitator.test/verify' => fn () => throw new \Illuminate\Http\Client\ConnectionException('timeout'),
        ]);

        $result = $this->service()->verify(
            ['payment' => 'data'],
            ['requirement' => 'data'],
        );

        $this->assertFalse($result['isValid']);
        $this->assertStringContainsString('Facilitator unreachable', $result['invalidReason']);
    }

    /** @test */
    public function settle_posts_to_facilitator(): void
    {
        Http::fake([
            'facilitator.test/settle' => Http::response([
                'success' => true,
                'txHash' => '0xdeadbeef',
            ]),
        ]);

        $result = $this->service()->settle(
            ['payment' => 'data'],
            ['requirement' => 'data'],
        );

        $this->assertTrue($result['success']);

        Http::assertSent(function ($request) {
            return $request->url() === 'https://facilitator.test/settle'
                && $request['paymentPayload']['payment'] === 'data';
        });
    }

    /** @test */
    public function settle_returns_failure_on_error(): void
    {
        Http::fake([
            'facilitator.test/settle' => Http::response('error', 500),
        ]);

        $result = $this->service()->settle(
            ['payment' => 'data'],
            ['requirement' => 'data'],
        );

        $this->assertFalse($result['success']);
    }
}
