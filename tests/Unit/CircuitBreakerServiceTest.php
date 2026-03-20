<?php

namespace Tests\Unit;

use App\Models\Agent;
use App\Services\CircuitBreakerService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Tests\TestCase;

class CircuitBreakerServiceTest extends TestCase
{
    use RefreshDatabase;

    private CircuitBreakerService $cb;

    protected function setUp(): void
    {
        parent::setUp();
        $this->cb = new CircuitBreakerService;
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function makeAgent(bool $circuitBreakerActive = false): Agent
    {
        return Agent::create([
            'name' => 'TestAgent-'.Str::random(4),
            'wallet_address' => '0x1234567890123456789012345678901234567890',
            'chain_id' => '84532',
            'circuit_breaker_active' => $circuitBreakerActive,
        ]);
    }

    // -------------------------------------------------------------------------
    // isActive()
    // -------------------------------------------------------------------------

    /** @test */
    public function it_returns_false_when_circuit_breaker_is_inactive_in_db(): void
    {
        $agent = $this->makeAgent(false);

        $this->assertFalse($this->cb->isActive($agent->id));
    }

    /** @test */
    public function it_returns_true_when_circuit_breaker_is_active_in_db(): void
    {
        $agent = $this->makeAgent(true);

        $this->assertTrue($this->cb->isActive($agent->id));
    }

    // -------------------------------------------------------------------------
    // trip()
    // -------------------------------------------------------------------------

    /** @test */
    public function it_sets_circuit_breaker_active_in_db_on_trip(): void
    {
        $agent = $this->makeAgent(false);

        $this->cb->trip($agent, 'Test reason');

        $this->assertDatabaseHas('agents', [
            'id' => $agent->id,
            'circuit_breaker_active' => true,
            'circuit_breaker_reason' => 'Test reason',
        ]);
    }

    /** @test */
    public function it_clears_cache_after_trip(): void
    {
        $agent = $this->makeAgent(false);
        $cacheKey = 'mandate:cb:'.$agent->id;

        // Seed a stale false value into cache
        Cache::put($cacheKey, false, 30);

        $this->cb->trip($agent, 'Cache invalidation test');

        $this->assertFalse(Cache::has($cacheKey));
    }

    // -------------------------------------------------------------------------
    // reset()
    // -------------------------------------------------------------------------

    /** @test */
    public function it_sets_circuit_breaker_inactive_in_db_on_reset(): void
    {
        $agent = $this->makeAgent(true);

        $this->cb->reset($agent);

        $this->assertDatabaseHas('agents', [
            'id' => $agent->id,
            'circuit_breaker_active' => false,
        ]);
    }

    // -------------------------------------------------------------------------
    // toggle()
    // -------------------------------------------------------------------------

    /** @test */
    public function it_resets_and_returns_false_when_toggling_active_agent(): void
    {
        $agent = $this->makeAgent(true);

        $result = $this->cb->toggle($agent);

        $this->assertFalse($result);
        $this->assertDatabaseHas('agents', [
            'id' => $agent->id,
            'circuit_breaker_active' => false,
        ]);
    }

    /** @test */
    public function it_trips_and_returns_true_when_toggling_inactive_agent(): void
    {
        $agent = $this->makeAgent(false);

        $result = $this->cb->toggle($agent);

        $this->assertTrue($result);
        $this->assertDatabaseHas('agents', [
            'id' => $agent->id,
            'circuit_breaker_active' => true,
        ]);
    }

    // -------------------------------------------------------------------------
    // Cache read-through after trip()
    // -------------------------------------------------------------------------

    /** @test */
    public function it_reads_from_cache_on_subsequent_is_active_calls_after_trip(): void
    {
        $agent = $this->makeAgent(false);
        $cacheKey = 'mandate:cb:'.$agent->id;

        // Cache must be empty before the first isActive() call
        Cache::forget($cacheKey);

        $this->cb->trip($agent, 'Cache warm-up test');

        // trip() forgets the key; isActive() must re-populate it
        $this->assertFalse(Cache::has($cacheKey), 'Cache should be empty immediately after trip()');

        // First call after trip sets the cache
        $this->cb->isActive($agent->id);

        $this->assertTrue(Cache::has($cacheKey), 'isActive() should have warmed the cache');
        $this->assertTrue(Cache::get($cacheKey), 'Cached value should reflect tripped state');
    }
}
