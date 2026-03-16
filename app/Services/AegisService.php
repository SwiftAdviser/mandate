<?php

namespace App\Services;

use App\Enums\RiskLevel;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AegisService
{
    private string $apiUrl;
    private string $apiKey;
    private int $timeout;
    private int $retries;
    private array $circuitBreaker;

    public function __construct()
    {
        $this->apiUrl  = config('mandate.aegis.api_url', 'https://api.web3antivirus.io');
        $this->apiKey  = config('mandate.aegis.api_key') ?? '';
        $this->timeout = config('mandate.aegis.timeout', 8);
        $this->retries = config('mandate.aegis.retries', 2);
        $this->circuitBreaker = config('mandate.aegis.circuit_breaker', [
            'threshold'   => 5,
            'window'      => 60,
            'reset_after' => 30,
        ]);
    }

    /**
     * Run all three W3A checks in parallel and compute aggregate risk level.
     */
    public function assess(array $payload, array $decoded): array
    {
        $chainId = $payload['chainId'];
        $to      = $payload['to'];
        $from    = $payload['from'] ?? '0x0000000000000000000000000000000000000000';
        $value   = $this->toHexWei($payload['valueWei'] ?? '0');
        $data    = $payload['calldata'] ?? '0x';
        $token   = $decoded['token'] ?? null;

        // If circuit breaker is open, return degraded
        if ($this->isCircuitOpen()) {
            return $this->degradedResult();
        }

        $simulation = null;
        $tokenCheck = null;
        $addressCheck = null;
        $errors = [];

        try {
            $responses = Http::pool(function ($pool) use ($from, $to, $value, $data, $chainId, $token) {
                $pool->as('simulation')
                    ->timeout($this->timeout)
                    ->retry($this->retries, 100)
                    ->withHeaders($this->headers())
                    ->post("{$this->apiUrl}/api/public/v1/extension/simulation/transaction?chainId={$chainId}", [
                        'transaction' => [
                            'from'  => $from,
                            'to'    => $to,
                            'value' => $value,
                            'data'  => $data,
                        ],
                    ]);

                if ($token) {
                    $pool->as('token')
                        ->timeout($this->timeout)
                        ->retry($this->retries, 100)
                        ->withHeaders($this->headers())
                        ->get("{$this->apiUrl}/api/public/v2/extension/token-intelligence/token/{$token}/risks", [
                            'chainId' => $chainId,
                        ]);
                }

                $pool->as('address')
                    ->timeout($this->timeout)
                    ->retry($this->retries, 100)
                    ->withHeaders($this->headers())
                    ->get("{$this->apiUrl}/api/public/v1/extension/account/{$to}/toxic-score", [
                        'chainId' => $chainId,
                    ]);
            });

            // Parse simulation
            if (isset($responses['simulation']) && $responses['simulation']->successful()) {
                $simulation = $responses['simulation']->json();
            } else {
                $errors[] = 'simulation';
            }

            // Parse token check
            if ($token && isset($responses['token'])) {
                if ($responses['token']->successful()) {
                    $tokenCheck = $responses['token']->json();
                } else {
                    $errors[] = 'token';
                }
            }

            // Parse address check
            if (isset($responses['address']) && $responses['address']->successful()) {
                $addressCheck = $responses['address']->json();
            } else {
                $errors[] = 'address';
            }
        } catch (\Throwable $e) {
            Log::warning('[AegisService] Pool request failed', ['error' => $e->getMessage()]);
            $this->recordFailure();
            return $this->degradedResult();
        }

        // Record failures for circuit breaker
        if (count($errors) > 0) {
            $this->recordFailure();
        }

        // If ALL checks failed, degrade
        $allFailed = ($simulation === null) && ($addressCheck === null) && ($token ? $tokenCheck === null : true);
        if ($allFailed) {
            return $this->degradedResult();
        }

        return $this->computeRiskLevel($simulation, $tokenCheck, $addressCheck);
    }

    /**
     * Standalone check — used by /api/risk/check endpoint.
     */
    public function check(string $to, int $chainId, string $calldata = '0x', string $value = '0', string $from = '0x0000000000000000000000000000000000000000'): array
    {
        $payload = [
            'chainId'  => $chainId,
            'to'       => $to,
            'calldata' => $calldata,
            'valueWei' => $value,
            'from'     => $from,
        ];

        return $this->assess($payload, []);
    }

    private function computeRiskLevel(?array $simulation, ?array $tokenCheck, ?array $addressCheck): array
    {
        $warnings = [];
        $riskLevel = RiskLevel::SAFE;

        // Simulation detectors → CRITICAL
        $detectors = $simulation['detectors'] ?? [];
        if (count($detectors) > 0) {
            $riskLevel = RiskLevel::CRITICAL;
            foreach ($detectors as $d) {
                $warnings[] = $d['description'] ?? $d['code'] ?? 'simulation_detector';
            }
        }

        // Token honeypot → CRITICAL
        if ($tokenCheck) {
            $isHoneypot = $this->isHoneypot($tokenCheck);
            if ($isHoneypot) {
                $riskLevel = RiskLevel::CRITICAL;
                $warnings[] = 'token_flagged_honeypot';
            }
        }

        // Address toxic score
        $toxicScore = null;
        if ($addressCheck) {
            $toxicScore = (float) ($addressCheck['toxic_score'] ?? $addressCheck['toxicScore'] ?? 0);

            if ($toxicScore > 50 && $riskLevel !== RiskLevel::CRITICAL) {
                $riskLevel = RiskLevel::HIGH;
                $warnings[] = "address_toxic_score_{$toxicScore}";
            } elseif ($toxicScore >= 20 && $toxicScore <= 50 && !in_array($riskLevel, [RiskLevel::CRITICAL, RiskLevel::HIGH])) {
                $riskLevel = RiskLevel::MEDIUM;
                $warnings[] = "address_toxic_score_{$toxicScore}";
            } elseif ($toxicScore > 0 && $toxicScore < 20 && $riskLevel === RiskLevel::SAFE) {
                $riskLevel = RiskLevel::LOW;
            }
        }

        // Minor simulation warnings (non-detector issues) → MEDIUM if still SAFE/LOW
        $simulationWarnings = $simulation['warnings'] ?? [];
        if (count($simulationWarnings) > 0 && in_array($riskLevel, [RiskLevel::SAFE, RiskLevel::LOW])) {
            $riskLevel = RiskLevel::MEDIUM;
            foreach ($simulationWarnings as $w) {
                $warnings[] = is_string($w) ? $w : ($w['description'] ?? 'simulation_warning');
            }
        }

        return [
            'risk_level'    => $riskLevel->value,
            'degraded'      => false,
            'warnings'      => $warnings,
            'toxic_score'   => $toxicScore,
            'simulation'    => $simulation,
            'token_check'   => $tokenCheck,
            'address_check' => $addressCheck,
        ];
    }

    private function isHoneypot(?array $tokenCheck): bool
    {
        if (!$tokenCheck) return false;

        // W3A token intelligence flags honeypot via risks array
        $risks = $tokenCheck['risks'] ?? [];
        foreach ($risks as $risk) {
            $code = strtolower($risk['code'] ?? $risk['type'] ?? '');
            if (str_contains($code, 'honeypot')) {
                return true;
            }
        }

        return (bool) ($tokenCheck['isHoneypot'] ?? $tokenCheck['is_honeypot'] ?? false);
    }

    /**
     * Convert decimal wei string to hex for W3A API.
     */
    public function toHexWei(string $value): string
    {
        if (str_starts_with($value, '0x') || str_starts_with($value, '0X')) {
            return strtolower($value);
        }

        if (!ctype_digit($value)) {
            return $value;
        }

        // Use bcmath for large numbers
        $hex = '';
        $remaining = $value;

        if ($remaining === '0') {
            return '0x0';
        }

        while (bccomp($remaining, '0') > 0) {
            $mod = bcmod($remaining, '16');
            $hex = dechex((int) $mod) . $hex;
            $remaining = bcdiv($remaining, '16', 0);
        }

        return '0x' . $hex;
    }

    private function headers(): array
    {
        return [
            'x-api-key'   => $this->apiKey,
            'Content-Type' => 'application/json',
        ];
    }

    // ── Circuit breaker (Redis-based) ────────────────────────────────────

    private function isCircuitOpen(): bool
    {
        $resetKey = 'aegis:circuit:open_until';
        $openUntil = Cache::get($resetKey);

        if ($openUntil && now()->timestamp < $openUntil) {
            return true;
        }

        return false;
    }

    private function recordFailure(): void
    {
        $key    = 'aegis:circuit:failures';
        $window = $this->circuitBreaker['window'];

        $count = Cache::increment($key);
        if ($count === 1) {
            Cache::put($key, 1, $window);
        }

        if ($count >= $this->circuitBreaker['threshold']) {
            $resetAfter = $this->circuitBreaker['reset_after'];
            Cache::put('aegis:circuit:open_until', now()->timestamp + $resetAfter, $resetAfter);
            Cache::forget($key);

            Log::warning('[AegisService] Circuit breaker OPEN — W3A failures exceeded threshold', [
                'failures' => $count,
                'reset_after' => $resetAfter,
            ]);
        }
    }

    private function degradedResult(): array
    {
        return [
            'risk_level'    => RiskLevel::SAFE->value,
            'degraded'      => true,
            'warnings'      => [],
            'toxic_score'   => null,
            'simulation'    => null,
            'token_check'   => null,
            'address_check' => null,
        ];
    }
}
