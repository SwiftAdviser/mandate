<?php

namespace App\Http\Middleware;

use Closure;
use Firebase\JWT\JWT;
use Firebase\JWT\JWK;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PrivyAuth
{
    public function handle(Request $request, Closure $next): mixed
    {
        $token = $request->bearerToken()
            ?? $request->cookie('privy-token');

        if (!$token) {
            if ($request->expectsJson()) {
                return response()->json(['error' => 'Privy authentication required.'], 401);
            }
            return redirect('/login');
        }

        $appId = config('mandate.privy.app_id');

        if (!$appId) {
            Log::error('Privy App ID not configured.');
            return response()->json(['error' => 'Authentication not configured.'], 500);
        }

        try {
            $keys = $this->fetchJwks($appId);
            $decoded = JWT::decode($token, $keys);

            if ($decoded->iss !== 'privy.io') {
                return $this->unauthenticated($request, 'Invalid token issuer.');
            }

            if ($decoded->aud !== $appId) {
                return $this->unauthenticated($request, 'Invalid token audience.');
            }

            $request->attributes->set('privy_did', $decoded->sub);
            $request->attributes->set('privy_sid', $decoded->sid ?? null);
            $request->attributes->set('privy_claims', $decoded);

        } catch (\Exception $e) {
            return $this->unauthenticated($request, 'Invalid or expired token.');
        }

        return $next($request);
    }

    private function fetchJwks(string $appId): array
    {
        $jwks = Cache::remember("privy_jwks_{$appId}", 300, function () use ($appId) {
            $resp = Http::timeout(5)->get("https://auth.privy.io/api/v1/apps/{$appId}/jwks.json");
            return $resp->json();
        });

        return JWK::parseKeySet($jwks);
    }

    private function unauthenticated(Request $request, string $message): mixed
    {
        if ($request->expectsJson()) {
            return response()->json(['error' => $message], 401);
        }
        return redirect('/login');
    }
}
