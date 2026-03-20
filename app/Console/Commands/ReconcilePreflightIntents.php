<?php

namespace App\Console\Commands;

use App\Models\TxIntent;
use App\Services\AlchemyTransferSearchService;
use App\Services\IntentStateMachineService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ReconcilePreflightIntents extends Command
{
    protected $signature = 'mandate:reconcile-preflights';

    protected $description = 'Find on-chain transfers matching preflight intents and enrich with tx data';

    public function __construct(
        private AlchemyTransferSearchService $transferSearch,
        private IntentStateMachineService $stateMachine,
    ) {
        parent::__construct();
    }

    public function handle(): void
    {
        if (! config('mandate.preflight.reconcile_enabled', true)) {
            return;
        }

        $staleMinutes = (int) config('mandate.preflight.stale_after_minutes', 30);

        $this->reconcileActive($staleMinutes);
        $this->expireStale($staleMinutes);
    }

    private function reconcileActive(int $staleMinutes): void
    {
        $intents = TxIntent::with('agent')
            ->where('status', TxIntent::STATUS_PREFLIGHT)
            ->whereHas('agent', fn ($q) => $q->whereNotNull('wallet_address'))
            ->where('created_at', '>', now()->subMinutes($staleMinutes))
            ->get();

        foreach ($intents as $intent) {
            try {
                $match = $this->transferSearch->findMatchingTransfer($intent);

                if ($match === null) {
                    continue;
                }

                // Set tx_hash before fetching receipt
                $intent->update(['tx_hash' => $match['hash']]);

                // Fetch receipt for gas/block data
                $receipt = $this->fetchReceipt($intent);

                if ($receipt !== null) {
                    $txStatus = $receipt['status'] ?? null;
                    $success = $txStatus === '0x1';
                    $gasUsed = $receipt['gasUsed'] ?? null;
                    $blockNum = $receipt['blockNumber'] ?? null;

                    $intent->update([
                        'gas_used' => $gasUsed ? (string) hexdec($gasUsed) : null,
                        'block_number' => $blockNum ? (string) hexdec($blockNum) : null,
                    ]);

                    $newStatus = $success ? TxIntent::STATUS_CONFIRMED : TxIntent::STATUS_FAILED;

                    $this->stateMachine->transition($intent, $newStatus, 'system', 'system', [
                        'source' => 'preflight_reconcile',
                        'receipt_status' => $txStatus,
                        'gas_used' => $gasUsed,
                    ]);
                }

            } catch (\Throwable $e) {
                Log::warning("ReconcilePreflightIntents: error processing intent {$intent->id}: ".$e->getMessage());
            }
        }
    }

    private function expireStale(int $staleMinutes): void
    {
        $stale = TxIntent::where('status', TxIntent::STATUS_PREFLIGHT)
            ->where('created_at', '<', now()->subMinutes($staleMinutes))
            ->get();

        foreach ($stale as $intent) {
            try {
                $this->stateMachine->transition($intent, TxIntent::STATUS_EXPIRED, 'system', 'system', [
                    'reason' => 'preflight_stale',
                ]);
            } catch (\Throwable $e) {
                Log::warning("ReconcilePreflightIntents: error expiring intent {$intent->id}: ".$e->getMessage());
            }
        }
    }

    private function fetchReceipt(TxIntent $intent): ?array
    {
        $rpcBase = config("mandate.rpc.{$intent->chain_id}");
        $apiKey = config('mandate.alchemy_api_key');

        if (! $rpcBase) {
            return null;
        }

        $rpcUrl = $apiKey ? $rpcBase.$apiKey : $rpcBase;

        try {
            $response = Http::timeout(8)->post($rpcUrl, [
                'jsonrpc' => '2.0',
                'id' => 1,
                'method' => 'eth_getTransactionReceipt',
                'params' => [$intent->tx_hash],
            ]);

            return $response->json('result') ?: null;
        } catch (\Throwable) {
            return null;
        }
    }
}
