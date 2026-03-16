<?php

namespace Tests\Unit;

use App\Services\AegisService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AegisServiceTest extends TestCase
{
    private AegisService $service;

    protected function setUp(): void
    {
        parent::setUp();
        Http::preventStrayRequests();
        Cache::flush();

        config([
            'mandate.aegis.enabled'  => true,
            'mandate.aegis.api_key'  => 'test-key',
            'mandate.aegis.api_url'  => 'https://api.web3antivirus.io',
            'mandate.aegis.timeout'  => 8,
            'mandate.aegis.retries'  => 0,
            'mandate.aegis.circuit_breaker' => [
                'threshold'   => 5,
                'window'      => 60,
                'reset_after' => 30,
            ],
        ]);

        $this->service = new AegisService();
    }

    /** @test */
    public function it_returns_safe_when_all_checks_pass(): void
    {
        Http::fake([
            '*/simulation/transaction*' => Http::response([
                'detectors' => [],
                'assetsMovement' => [],
            ]),
            '*/token/*/risks*' => Http::response([
                'risks' => [],
            ]),
            '*/account/*/toxic-score*' => Http::response([
                'toxic_score' => 0,
            ]),
        ]);

        $result = $this->service->assess(
            ['chainId' => 84532, 'to' => '0xabc123abc123abc123abc123abc123abc123abc1', 'valueWei' => '0', 'calldata' => '0x'],
            ['token' => '0x036CbD53842c5426634e7929541eC2318f3dCF7e'],
        );

        $this->assertSame('SAFE', $result['risk_level']);
        $this->assertFalse($result['degraded']);
        $this->assertEmpty($result['warnings']);
    }

    /** @test */
    public function it_returns_critical_when_simulation_has_detectors(): void
    {
        Http::fake([
            '*/simulation/transaction*' => Http::response([
                'detectors' => [
                    ['code' => 'UNLIMITED_APPROVAL', 'description' => 'Unlimited token approval detected'],
                ],
            ]),
            '*/account/*/toxic-score*' => Http::response(['toxic_score' => 0]),
        ]);

        $result = $this->service->assess(
            ['chainId' => 84532, 'to' => '0xabc123abc123abc123abc123abc123abc123abc1', 'valueWei' => '0', 'calldata' => '0x'],
            [],
        );

        $this->assertSame('CRITICAL', $result['risk_level']);
        $this->assertContains('Unlimited token approval detected', $result['warnings']);
    }

    /** @test */
    public function it_returns_high_when_address_toxic_score_above_50(): void
    {
        Http::fake([
            '*/simulation/transaction*' => Http::response(['detectors' => []]),
            '*/account/*/toxic-score*'  => Http::response(['toxic_score' => 75]),
        ]);

        $result = $this->service->assess(
            ['chainId' => 84532, 'to' => '0xabc123abc123abc123abc123abc123abc123abc1', 'valueWei' => '0', 'calldata' => '0x'],
            [],
        );

        $this->assertSame('HIGH', $result['risk_level']);
    }

    /** @test */
    public function it_returns_degraded_when_w3a_unreachable(): void
    {
        Http::fake([
            '*' => Http::response(null, 500),
        ]);

        $result = $this->service->assess(
            ['chainId' => 84532, 'to' => '0xabc123abc123abc123abc123abc123abc123abc1', 'valueWei' => '0', 'calldata' => '0x'],
            [],
        );

        $this->assertTrue($result['degraded']);
        $this->assertSame('SAFE', $result['risk_level']);
    }

    /** @test */
    public function it_respects_circuit_breaker_after_failures(): void
    {
        config(['mandate.aegis.circuit_breaker.threshold' => 2]);
        $this->service = new AegisService();

        Http::fake([
            '*' => Http::response(null, 500),
        ]);

        // Trigger failures to open circuit breaker
        $this->service->assess(
            ['chainId' => 84532, 'to' => '0xabc123abc123abc123abc123abc123abc123abc1', 'valueWei' => '0', 'calldata' => '0x'],
            [],
        );
        $this->service->assess(
            ['chainId' => 84532, 'to' => '0xabc123abc123abc123abc123abc123abc123abc1', 'valueWei' => '0', 'calldata' => '0x'],
            [],
        );

        // Third call should hit circuit breaker (no HTTP calls)
        Http::fake(); // Reset to prevent stray
        Http::preventStrayRequests();

        $result = $this->service->assess(
            ['chainId' => 84532, 'to' => '0xabc123abc123abc123abc123abc123abc123abc1', 'valueWei' => '0', 'calldata' => '0x'],
            [],
        );

        $this->assertTrue($result['degraded']);
    }

    /** @test */
    public function it_converts_decimal_value_to_hex(): void
    {
        $this->assertSame('0x0', $this->service->toHexWei('0'));
        $this->assertSame('0xde0b6b3a7640000', $this->service->toHexWei('1000000000000000000'));
        $this->assertSame('0x1', $this->service->toHexWei('1'));
        $this->assertSame('0xff', $this->service->toHexWei('255'));
    }

    /** @test */
    public function it_passes_through_hex_values(): void
    {
        $this->assertSame('0xabc', $this->service->toHexWei('0xABC'));
        $this->assertSame('0x0', $this->service->toHexWei('0x0'));
    }

    /** @test */
    public function it_returns_critical_when_token_is_honeypot(): void
    {
        Http::fake([
            '*/simulation/transaction*' => Http::response(['detectors' => []]),
            '*/token/*/risks*' => Http::response([
                'risks' => [
                    ['code' => 'honeypot', 'description' => 'Token is a honeypot'],
                ],
            ]),
            '*/account/*/toxic-score*' => Http::response(['toxic_score' => 0]),
        ]);

        $result = $this->service->assess(
            ['chainId' => 84532, 'to' => '0xabc123abc123abc123abc123abc123abc123abc1', 'valueWei' => '0', 'calldata' => '0x'],
            ['token' => '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'],
        );

        $this->assertSame('CRITICAL', $result['risk_level']);
        $this->assertContains('token_flagged_honeypot', $result['warnings']);
    }

    /** @test */
    public function it_returns_medium_for_moderate_toxic_score(): void
    {
        Http::fake([
            '*/simulation/transaction*' => Http::response(['detectors' => []]),
            '*/account/*/toxic-score*'  => Http::response(['toxic_score' => 35]),
        ]);

        $result = $this->service->assess(
            ['chainId' => 84532, 'to' => '0xabc123abc123abc123abc123abc123abc123abc1', 'valueWei' => '0', 'calldata' => '0x'],
            [],
        );

        $this->assertSame('MEDIUM', $result['risk_level']);
    }
}
