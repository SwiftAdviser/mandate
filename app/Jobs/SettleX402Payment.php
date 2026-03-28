<?php

namespace App\Jobs;

use App\Services\X402FacilitatorService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;

class SettleX402Payment implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public int $tries = 3;

    public int $backoff = 5;

    public function __construct(
        public array $paymentPayload,
        public array $paymentRequirements,
    ) {}

    public function handle(X402FacilitatorService $facilitator): void
    {
        $result = $facilitator->settle($this->paymentPayload, $this->paymentRequirements);

        if (empty($result['success'])) {
            Log::warning('x402 settlement failed', [
                'requirements' => $this->paymentRequirements,
            ]);
        }
    }
}
