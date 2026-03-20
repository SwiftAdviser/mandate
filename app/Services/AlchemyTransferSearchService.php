<?php

namespace App\Services;

use App\Models\TokenRegistry;
use App\Models\TxIntent;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;

class AlchemyTransferSearchService
{
    public function findMatchingTransfer(TxIntent $intent): ?array
    {
        $intent->loadMissing('agent');
        $agent = $intent->agent;

        if (! $agent->wallet_address) {
            return null;
        }

        $chainId = $intent->chain_id;
        $rpcBase = config("mandate.rpc.{$chainId}");

        if (! $rpcBase) {
            return null;
        }

        $apiKey = config('mandate.alchemy_api_key');
        $rpcUrl = $apiKey ? $rpcBase.$apiKey : $rpcBase;

        // Get current block number
        $currentBlock = $this->rpcCall($rpcUrl, 'eth_blockNumber');
        if ($currentBlock === null) {
            return null;
        }

        $lookback = (int) config('mandate.preflight.lookback_blocks', 1000);
        $fromBlock = max(0, hexdec($currentBlock) - $lookback);

        // Resolve token contract from registry
        $token = TokenRegistry::where('chain_id', $chainId)
            ->where('symbol', $intent->decoded_token)
            ->first();

        // Build transfer search params
        $params = [
            'fromAddress' => $agent->wallet_address,
            'toAddress' => $intent->decoded_recipient,
            'fromBlock' => '0x'.dechex($fromBlock),
            'toBlock' => 'latest',
            'order' => 'desc',
            'maxCount' => '0x5',
            'withMetadata' => true,
        ];

        if ($token) {
            $params['category'] = ['erc20'];
            $params['contractAddresses'] = [$token->address];
        } else {
            $params['category'] = ['erc20', 'external'];
        }

        $transfers = $this->rpcCall($rpcUrl, 'alchemy_getAssetTransfers', [$params]);
        if ($transfers === null) {
            return null;
        }

        $transferList = $transfers['transfers'] ?? [];
        if (empty($transferList)) {
            return null;
        }

        // Collect existing tx_hashes to avoid duplicates
        $usedHashes = TxIntent::whereNotNull('tx_hash')
            ->pluck('tx_hash')
            ->flip()
            ->all();

        $tolerancePct = (float) config('mandate.preflight.amount_tolerance_pct', 5.0);
        $expectedAmount = (float) $intent->amount_usd_computed;
        $intentCreatedAt = $intent->created_at;

        // Filter and find best match
        $candidates = [];

        foreach ($transferList as $transfer) {
            $hash = $transfer['hash'] ?? null;
            if (! $hash || isset($usedHashes[$hash])) {
                continue;
            }

            // Filter by timestamp: must be after intent creation
            $blockTimestamp = $transfer['metadata']['blockTimestamp'] ?? null;
            if (! $blockTimestamp) {
                continue;
            }

            $txTime = Carbon::parse($blockTimestamp);
            if ($txTime->lt($intentCreatedAt)) {
                continue;
            }

            // Filter by amount tolerance
            $transferValue = (float) ($transfer['value'] ?? 0);
            if ($expectedAmount > 0) {
                $diff = abs($transferValue - $expectedAmount) / $expectedAmount * 100;
                if ($diff > $tolerancePct) {
                    continue;
                }
            }

            // Track time distance from intent creation for "closest" pick
            $candidates[] = [
                'transfer' => $transfer,
                'time_distance' => abs($txTime->diffInSeconds($intentCreatedAt)),
            ];
        }

        if (empty($candidates)) {
            return null;
        }

        // Pick closest in time to intent creation
        usort($candidates, fn ($a, $b) => $a['time_distance'] <=> $b['time_distance']);

        $best = $candidates[0]['transfer'];

        return [
            'hash' => $best['hash'],
            'blockNum' => $best['blockNum'],
            'value' => $best['value'],
        ];
    }

    private function rpcCall(string $url, string $method, array $params = []): mixed
    {
        try {
            $response = Http::timeout(8)->post($url, [
                'jsonrpc' => '2.0',
                'id' => 1,
                'method' => $method,
                'params' => $params ?: [],
            ]);

            return $response->json('result');
        } catch (\Throwable) {
            return null;
        }
    }
}
