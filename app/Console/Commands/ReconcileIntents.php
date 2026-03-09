<?php

namespace App\Console\Commands;

use App\Models\TxIntent;
use App\Services\CircuitBreakerService;
use App\Services\EnvelopeVerifierService;
use App\Services\IntentStateMachineService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ReconcileIntents extends Command
{
    protected $signature   = 'mandate:reconcile-intents';
    protected $description = 'Confirm broadcasted intents, expire stale reserved/approved intents';

    public function __construct(
        private IntentStateMachineService $stateMachine,
        private EnvelopeVerifierService   $verifier,
        private CircuitBreakerService     $circuitBreaker,
    ) {
        parent::__construct();
    }

    public function handle(): void
    {
        $this->reconcileBroadcasted();
        $this->stateMachine->expireStale();
    }

    private function reconcileBroadcasted(): void
    {
        $broadcasted = TxIntent::with('agent')
            ->where('status', TxIntent::STATUS_BROADCASTED)
            ->whereNotNull('tx_hash')
            ->get();

        foreach ($broadcasted as $intent) {
            try {
                $receipt = $this->fetchReceipt($intent);

                if ($receipt === null) {
                    // No receipt yet — check if nonce was replaced (tx dropped)
                    if ($this->verifier->isNonceReplaced($intent)) {
                        $this->stateMachine->transition(
                            $intent, TxIntent::STATUS_FAILED, 'system', 'system',
                            ['block_reason' => 'nonce_replaced_tx_dropped']
                        );
                    }
                    continue;
                }

                // Got receipt — verify envelope before confirming
                $envelopeResult = $this->verifier->verify($intent, $intent->tx_hash);

                if ($envelopeResult === 'mismatch') {
                    $this->circuitBreaker->trip($intent->agent, 'security_violation: envelope mismatch on receipt');
                    $this->stateMachine->transition($intent, TxIntent::STATUS_FAILED, 'system', 'system', [
                        'block_reason' => 'security_violation',
                    ]);
                    continue;
                }

                $txStatus  = $receipt['status'] ?? null;
                $success   = $txStatus === '0x1';
                $gasUsed   = $receipt['gasUsed'] ?? null;
                $blockNum  = $receipt['blockNumber'] ?? null;

                $newStatus = $success ? TxIntent::STATUS_CONFIRMED : TxIntent::STATUS_FAILED;

                $intent->update([
                    'gas_used'     => $gasUsed ? (string) hexdec($gasUsed) : null,
                    'block_number' => $blockNum ? (string) hexdec($blockNum) : null,
                ]);

                $this->stateMachine->transition($intent, $newStatus, 'system', 'system', [
                    'receipt_status' => $txStatus,
                    'gas_used'       => $gasUsed,
                ]);

            } catch (\Throwable $e) {
                Log::warning("ReconcileIntents: error processing intent {$intent->id}: " . $e->getMessage());
            }
        }
    }

    private function fetchReceipt(TxIntent $intent): ?array
    {
        $rpcBase = config("mandate.rpc.{$intent->chain_id}");
        $apiKey  = config('mandate.alchemy_api_key');

        if (!$rpcBase) return null;

        $rpcUrl  = $apiKey ? $rpcBase . $apiKey : $rpcBase;

        try {
            $response = Http::timeout(8)->post($rpcUrl, [
                'jsonrpc' => '2.0',
                'id'      => 1,
                'method'  => 'eth_getTransactionReceipt',
                'params'  => [$intent->tx_hash],
            ]);

            return $response->json('result') ?: null;

        } catch (\Throwable) {
            return null;
        }
    }
}
