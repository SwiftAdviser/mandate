<?php

namespace App\Services;

use App\Models\TxIntent;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class EnvelopeVerifierService
{
    /**
     * Verify that a broadcasted txHash matches the stored intent.
     * Returns: 'match' | 'mismatch' | 'propagation_delay' | 'not_found'
     */
    public function verify(TxIntent $intent, string $txHash): string
    {
        $rpcUrl = $this->getRpcUrl($intent->chain_id);
        if (! $rpcUrl) {
            Log::error("EnvelopeVerifier: no RPC for chain {$intent->chain_id}");

            return 'not_found';
        }

        try {
            $response = Http::timeout(10)->post($rpcUrl, [
                'jsonrpc' => '2.0',
                'id' => 1,
                'method' => 'eth_getTransactionByHash',
                'params' => [$txHash],
            ]);

            if (! $response->successful()) {
                return 'propagation_delay';
            }

            $tx = $response->json('result');

            if ($tx === null) {
                return 'propagation_delay'; // Not yet propagated
            }

        } catch (\Throwable $e) {
            Log::warning('EnvelopeVerifier RPC error: '.$e->getMessage());

            return 'propagation_delay';
        }

        return $this->compareEnvelope($intent, $tx);
    }

    /**
     * Check if a nonce has been replaced on-chain (dropped tx).
     */
    public function isNonceReplaced(TxIntent $intent): bool
    {
        $rpcUrl = $this->getRpcUrl($intent->chain_id);
        if (! $rpcUrl) {
            return false;
        }

        try {
            $response = Http::timeout(5)->post($rpcUrl, [
                'jsonrpc' => '2.0', 'id' => 1,
                'method' => 'eth_getTransactionCount',
                'params' => [$intent->agent->wallet_address, 'latest'],
            ]);

            $onchainNonce = hexdec($response->json('result', '0x0'));

            return $onchainNonce > $intent->nonce;

        } catch (\Throwable) {
            return false;
        }
    }

    private function compareEnvelope(TxIntent $intent, array $tx): string
    {
        $mismatch = false;

        // from address
        if (strtolower($tx['from'] ?? '') !== strtolower($intent->agent->wallet_address)) {
            Log::warning('EnvelopeVerifier: from address mismatch', [
                'intent' => $intent->id,
                'expected' => $intent->agent->wallet_address,
                'got' => $tx['from'] ?? '',
            ]);
            $mismatch = true;
        }

        // to address
        if (strtolower($tx['to'] ?? '') !== strtolower($intent->to_address)) {
            $mismatch = true;
        }

        // nonce
        if (hexdec($tx['nonce'] ?? '0x0') !== (int) $intent->nonce) {
            $mismatch = true;
        }

        // calldata (input)
        if (strtolower($tx['input'] ?? '0x') !== strtolower($intent->calldata)) {
            $mismatch = true;
        }

        // value
        $txValue = hexdec($tx['value'] ?? '0x0');
        if ((string) $txValue !== $intent->value_wei) {
            $mismatch = true;
        }

        if ($mismatch) {
            Log::critical('EnvelopeVerifier: ENVELOPE MISMATCH — security violation', [
                'intent_id' => $intent->id,
                'tx_hash' => $tx['hash'] ?? '',
            ]);

            return 'mismatch';
        }

        return 'match';
    }

    private function getRpcUrl(string|int $chainId): ?string
    {
        $base = config("mandate.rpc.{$chainId}");
        $apiKey = config('mandate.alchemy_api_key');

        if (! $base) {
            return null;
        }

        return $apiKey ? $base.$apiKey : $base;
    }
}
