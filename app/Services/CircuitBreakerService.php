<?php

namespace App\Services;

use App\Models\Agent;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class CircuitBreakerService
{
    private const CACHE_PREFIX = 'mandate:cb:';

    /**
     * Check if circuit breaker is active. Uses Redis cache (30s TTL), falls back to DB.
     */
    public function isActive(string $agentId): bool
    {
        return Cache::remember(
            self::CACHE_PREFIX.$agentId,
            config('mandate.circuit_breaker_cache_ttl', 30),
            fn () => Agent::where('id', $agentId)->value('circuit_breaker_active') ?? false
        );
    }

    /**
     * Trip the circuit breaker — DB + invalidate cache immediately.
     */
    public function trip(Agent $agent, string $reason = 'Manual'): void
    {
        DB::table('agents')
            ->where('id', $agent->id)
            ->update([
                'circuit_breaker_active' => true,
                'circuit_breaker_tripped_at' => now(),
                'circuit_breaker_reason' => $reason,
            ]);

        Cache::forget(self::CACHE_PREFIX.$agent->id);
    }

    /**
     * Reset the circuit breaker.
     */
    public function reset(Agent $agent): void
    {
        DB::table('agents')
            ->where('id', $agent->id)
            ->update([
                'circuit_breaker_active' => false,
                'circuit_breaker_tripped_at' => null,
                'circuit_breaker_reason' => null,
            ]);

        Cache::forget(self::CACHE_PREFIX.$agent->id);
    }

    /**
     * Toggle and return new state.
     */
    public function toggle(Agent $agent): bool
    {
        if ($agent->circuit_breaker_active) {
            $this->reset($agent);

            return false;
        } else {
            $this->trip($agent, 'Manual toggle via dashboard');

            return true;
        }
    }
}
