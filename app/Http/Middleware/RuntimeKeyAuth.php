<?php

namespace App\Http\Middleware;

use App\Models\AgentApiKey;
use Closure;
use Illuminate\Http\Request;

class RuntimeKeyAuth
{
    public function handle(Request $request, Closure $next): mixed
    {
        $raw = $request->bearerToken();

        if (!$raw || (!str_starts_with($raw, 'mndt_live_') && !str_starts_with($raw, 'mndt_test_'))) {
            return response()->json(['error' => 'Missing or invalid runtime key.'], 401);
        }

        $hash = hash('sha256', $raw);
        $key  = AgentApiKey::with('agent')
            ->where('key_hash', $hash)
            ->whereNull('revoked_at')
            ->first();

        if (!$key) {
            return response()->json(['error' => 'Invalid runtime key.'], 401);
        }

        $agent = $key->agent;

        if ($agent->circuit_breaker_active) {
            return response()->json([
                'error'  => 'Circuit breaker active. All transactions blocked.',
                'reason' => $agent->circuit_breaker_reason,
            ], 403);
        }

        $key->updateQuietly(['last_used_at' => now()]);

        $request->attributes->set('agent', $agent);
        $request->attributes->set('api_key', $key);

        return $next($request);
    }
}
