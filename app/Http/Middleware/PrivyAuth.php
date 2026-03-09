<?php

namespace App\Http\Middleware;

use Closure;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Http\Request;
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

        $verificationKey = config('mandate.privy.verification_key');
        $appId           = config('mandate.privy.app_id');

        if (!$verificationKey || !$appId) {
            Log::error('Privy verification key or App ID not configured.');
            return response()->json(['error' => 'Authentication not configured.'], 500);
        }

        try {
            $decoded = JWT::decode($token, new Key($verificationKey, 'ES256'));

            if ($decoded->iss !== 'privy.io') {
                return response()->json(['error' => 'Invalid token issuer.'], 401);
            }

            if ($decoded->aud !== $appId) {
                return response()->json(['error' => 'Invalid token audience.'], 401);
            }

            $request->attributes->set('privy_did', $decoded->sub);
            $request->attributes->set('privy_sid', $decoded->sid ?? null);
            $request->attributes->set('privy_claims', $decoded);

        } catch (\Exception $e) {
            if ($request->expectsJson()) {
                return response()->json(['error' => 'Invalid or expired token.'], 401);
            }
            return redirect('/login');
        }

        return $next($request);
    }
}
