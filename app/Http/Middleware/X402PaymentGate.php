<?php

namespace App\Http\Middleware;

use App\Jobs\SettleX402Payment;
use App\Services\X402FacilitatorService;
use Closure;
use Illuminate\Http\Request;

class X402PaymentGate
{
    public function __construct(
        private X402FacilitatorService $facilitator,
    ) {}

    public function handle(Request $request, Closure $next): mixed
    {
        if (! config('mandate.x402.enabled')) {
            return $next($request);
        }

        // x402 v2: PAYMENT-SIGNATURE header (base64-encoded JSON)
        $signatureHeader = $request->header('PAYMENT-SIGNATURE')
            ?? $request->header('X-PAYMENT');

        if (! $signatureHeader) {
            return $this->paymentRequired($request);
        }

        $decoded = base64_decode($signatureHeader, true);
        $json = $decoded !== false ? $decoded : $signatureHeader;
        $paymentPayload = json_decode($json, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            return response()->json([
                'error' => 'Malformed payment signature: invalid JSON',
            ], 402);
        }

        // Use the accepted requirements from the payload, or build fresh
        $requirements = $paymentPayload['accepted'] ?? $this->buildAcceptsItem($request);
        $result = $this->facilitator->verify($paymentPayload, $requirements);

        if (empty($result['isValid'])) {
            return response()->json([
                'error' => $result['invalidReason'] ?? 'Payment verification failed',
            ], 402);
        }

        $request->attributes->set('x402_payment', true);
        $request->attributes->set('x402_payer', $result['payer'] ?? null);

        $response = $next($request);

        // Settle async
        SettleX402Payment::dispatch($paymentPayload, $requirements);

        return $response;
    }

    private function paymentRequired(Request $request): mixed
    {
        $accepts = $this->buildAcceptsItem($request);

        $paymentRequired = [
            'x402Version' => 2,
            'resource' => [
                'url' => $request->fullUrl(),
                'description' => 'Mandate policy validation',
                'mimeType' => 'application/json',
            ],
            'accepts' => [$accepts],
        ];

        return response()->json(
            array_merge(['error' => 'Payment required'], $paymentRequired),
            402,
        )->withHeaders([
            'PAYMENT-REQUIRED' => base64_encode(json_encode($paymentRequired)),
        ]);
    }

    private function buildAcceptsItem(Request $request): array
    {
        $isPreflight = str_contains($request->getPathInfo(), '/preflight');
        $amount = $isPreflight
            ? config('mandate.x402.prices.preflight', '50000')
            : config('mandate.x402.prices.validate', '100000');

        $networkId = config('mandate.x402.network_id', '8453');

        return [
            'scheme' => 'exact',
            'network' => "eip155:{$networkId}",
            'asset' => config('mandate.x402.asset'),
            'amount' => $amount,
            'payTo' => config('mandate.x402.pay_to'),
            'maxTimeoutSeconds' => 300,
            'extra' => [
                'name' => 'USD Coin',
                'version' => '2',
            ],
        ];
    }
}
