<?php

namespace App\Jobs;

use App\Models\TxIntent;
use App\Services\CircuitBreakerService;
use App\Services\EnvelopeVerifierService;
use App\Services\IntentStateMachineService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class VerifyIntentEnvelope implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 5;
    public int $backoff = 10; // seconds between retries

    public function __construct(
        public string $intentId,
        public string $txHash,
    ) {}

    public function handle(
        EnvelopeVerifierService   $verifier,
        IntentStateMachineService $stateMachine,
        CircuitBreakerService     $circuitBreaker,
    ): void {
        $intent = TxIntent::with('agent')->find($this->intentId);

        if (!$intent || $intent->status !== TxIntent::STATUS_BROADCASTED) {
            return;
        }

        $result = $verifier->verify($intent, $this->txHash);

        if ($result === 'propagation_delay') {
            // Re-queue; scheduler will also confirm via receipt
            $this->release(15);
            return;
        }

        if ($result === 'mismatch') {
            Log::critical('SECURITY VIOLATION: envelope mismatch', [
                'intent_id' => $intent->id,
                'tx_hash'   => $this->txHash,
                'agent_id'  => $intent->agent_id,
            ]);

            $circuitBreaker->trip($intent->agent, 'security_violation: envelope mismatch');

            $stateMachine->transition($intent, TxIntent::STATUS_FAILED, 'system', 'system', [
                'block_reason'     => 'security_violation',
                'event_type'       => 'security_violation',
                'tx_hash_received' => $this->txHash,
            ]);
            return;
        }

        // 'match' or 'not_found' — wait for ReconcileIntents to confirm via receipt
        Log::info('EnvelopeVerifier: envelope matched', ['intent_id' => $intent->id]);
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('VerifyIntentEnvelope job failed permanently', [
            'intent_id' => $this->intentId,
            'error'     => $exception->getMessage(),
        ]);
    }
}
