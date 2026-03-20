<?php

namespace App\Services;

use App\Models\TokenRegistry;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PriceOracleService
{
    /**
     * Convert a raw token amount to USD.
     * Returns null if price unavailable.
     */
    public function toUsd(int $chainId, string $tokenAddress, string $rawAmount): ?float
    {
        $token = TokenRegistry::where('chain_id', $chainId)
            ->where('address', strtolower($tokenAddress))
            ->first();

        if (! $token) {
            Log::warning("PriceOracle: unknown token {$tokenAddress} on chain {$chainId}");

            return null;
        }

        if ($token->is_stable) {
            return $this->rawToFloat($rawAmount, $token->decimals) * config('mandate.price_oracle.stable_usd', 1.0);
        }

        $price = $this->fetchPrice($token->coingecko_id ?? $token->symbol);

        if ($price === null) {
            return null;
        }

        return $this->rawToFloat($rawAmount, $token->decimals) * $price;
    }

    public function fetchPrice(string $coinId): ?float
    {
        $cacheKey = "mandate:price:{$coinId}";
        $ttl = config('mandate.price_oracle.cache_ttl', 60);

        return Cache::remember($cacheKey, $ttl, function () use ($coinId) {
            return $this->fetchFromAlchemy($coinId)
                ?? $this->fetchFromCoinGecko($coinId);
        });
    }

    private function fetchFromAlchemy(string $coinId): ?float
    {
        $apiKey = config('mandate.alchemy_api_key');
        if (! $apiKey) {
            return null;
        }

        // Alchemy token price API — uses contract address or symbol
        // Map coingecko_id to chain-specific contract if needed
        try {
            $response = Http::timeout(5)
                ->get("https://api.g.alchemy.com/prices/v1/{$apiKey}/tokens/by-symbol", [
                    'symbols' => strtoupper($coinId),
                ]);

            if ($response->successful()) {
                $data = $response->json('data.0.prices.0.value');

                return $data ? (float) $data : null;
            }
        } catch (\Throwable $e) {
            Log::warning("Alchemy price fetch failed for {$coinId}: ".$e->getMessage());
        }

        return null;
    }

    private function fetchFromCoinGecko(string $coinId): ?float
    {
        $apiKey = config('mandate.coingecko_api_key');
        $base = $apiKey ? 'https://pro-api.coingecko.com/api/v3' : 'https://api.coingecko.com/api/v3';

        try {
            $response = Http::timeout(5)
                ->withHeaders($apiKey ? ['x-cg-pro-api-key' => $apiKey] : [])
                ->get("{$base}/simple/price", [
                    'ids' => $coinId,
                    'vs_currencies' => 'usd',
                ]);

            if ($response->successful()) {
                return $response->json("{$coinId}.usd") ?? null;
            }
        } catch (\Throwable $e) {
            Log::warning("CoinGecko price fetch failed for {$coinId}: ".$e->getMessage());
        }

        return null;
    }

    private function rawToFloat(string $rawAmount, int $decimals): float
    {
        if ($rawAmount === '0') {
            return 0.0;
        }

        // BCMath for precision
        $divisor = bcpow('10', (string) $decimals);
        $result = bcdiv($rawAmount, $divisor, 18);

        return (float) $result;
    }
}
