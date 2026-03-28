<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RuntimeKeyOrX402
{
    public function __construct(
        private RuntimeKeyAuth $runtimeKeyAuth,
        private X402PaymentGate $x402Gate,
    ) {}

    public function handle(Request $request, Closure $next): mixed
    {
        // Try RuntimeKeyAuth first
        $runtimeResponse = $this->runtimeKeyAuth->handle($request, $next);

        // If runtime key succeeded (not 401/403), use it
        $status = $runtimeResponse->getStatusCode();
        if ($status !== 401) {
            return $runtimeResponse;
        }

        // Runtime key failed or missing: try x402 payment if enabled
        if (! config('mandate.x402.enabled')) {
            return $runtimeResponse;
        }

        return $this->x402Gate->handle($request, $next);
    }
}
