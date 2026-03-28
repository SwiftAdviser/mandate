<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class X402FacilitatorService
{
    public function verify(array $paymentPayload, array $paymentRequirements): array
    {
        $url = config('mandate.x402.facilitator_url');
        $timeout = config('mandate.x402.timeout', 10);

        try {
            $response = Http::timeout($timeout)
                ->withHeaders($this->authHeaders('POST', '/platform/v2/x402/verify'))
                ->post("{$url}/verify", [
                    'x402Version' => $paymentPayload['x402Version'] ?? 1,
                    'paymentPayload' => $paymentPayload,
                    'paymentRequirements' => $paymentRequirements,
                ]);

            if ($response->failed()) {
                return [
                    'isValid' => false,
                    'invalidReason' => "Facilitator error: HTTP {$response->status()}: {$response->body()}",
                ];
            }

            return $response->json();
        } catch (ConnectionException $e) {
            return [
                'isValid' => false,
                'invalidReason' => 'Facilitator unreachable: '.$e->getMessage(),
            ];
        }
    }

    public function settle(array $paymentPayload, array $paymentRequirements): array
    {
        $url = config('mandate.x402.facilitator_url');
        $timeout = config('mandate.x402.timeout', 10);

        try {
            $response = Http::timeout($timeout)
                ->withHeaders($this->authHeaders('POST', '/platform/v2/x402/settle'))
                ->post("{$url}/settle", [
                    'paymentPayload' => $paymentPayload,
                    'paymentRequirements' => $paymentRequirements,
                ]);

            if ($response->failed()) {
                return ['success' => false];
            }

            return $response->json();
        } catch (ConnectionException) {
            return ['success' => false];
        }
    }

    private function authHeaders(string $method, string $path): array
    {
        $keyId = config('mandate.x402.cdp_api_key_id');
        $keySecret = config('mandate.x402.cdp_api_key_secret');

        $headers = [
            'Correlation-Context' => 'sdk_version=1.29.0,sdk_language=php,source=x402,source_version=1.0.0',
        ];

        if ($keyId && $keySecret) {
            $headers['Authorization'] = 'Bearer '.$this->generateCdpJwt($keyId, $keySecret, $method, $path);
        }

        return $headers;
    }

    private function generateCdpJwt(string $keyId, string $keySecret, string $method, string $path): string
    {
        $uri = "{$method} api.cdp.coinbase.com{$path}";
        $now = time();

        // CDP uses EdDSA (Ed25519). Secret is 64 bytes: 32-byte seed + 32-byte public key.
        $raw = base64_decode($keySecret);
        $seed = substr($raw, 0, 32);
        $keypair = sodium_crypto_sign_seed_keypair($seed);
        $secretKey = sodium_crypto_sign_secretkey($keypair);

        $header = $this->base64url(json_encode([
            'alg' => 'EdDSA',
            'kid' => $keyId,
            'typ' => 'JWT',
            'nonce' => bin2hex(random_bytes(16)),
        ]));

        $payload = $this->base64url(json_encode([
            'sub' => $keyId,
            'iss' => 'cdp',
            'uris' => [$uri],
            'iat' => $now,
            'nbf' => $now,
            'exp' => $now + 120,
        ]));

        $message = "{$header}.{$payload}";
        $signature = sodium_crypto_sign_detached($message, $secretKey);

        return "{$message}.".$this->base64url($signature);
    }

    private function base64url(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
