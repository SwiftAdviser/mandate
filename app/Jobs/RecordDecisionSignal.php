<?php

namespace App\Jobs;

use App\Models\TxIntent;
use App\Services\PolicyInsightService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class RecordDecisionSignal implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 5;

    public function __construct(
        public readonly string $intentId,
        public readonly string $signalType,
        public readonly ?string $decisionNote = null,
    ) {}

    public function handle(PolicyInsightService $service): void
    {
        $intent = TxIntent::find($this->intentId);
        if (! $intent) {
            Log::warning('RecordDecisionSignal: missing intent', ['intent_id' => $this->intentId]);

            return;
        }

        $service->recordSignal($intent, $this->signalType, $this->decisionNote);

        $newInsights = $service->analyzeAgent($intent->agent_id);

        // Dispatch notifications only for insights with sufficient confidence
        foreach ($newInsights as $insight) {
            if ($insight->confidence >= config('mandate.insights.min_confidence')) {
                SendInsightNotification::dispatch($insight->id, $intent->agent_id);
            }
        }
    }

    public function failed(\Throwable $e): void
    {
        Log::error('RecordDecisionSignal failed', [
            'intent_id' => $this->intentId,
            'error' => $e->getMessage(),
        ]);
    }
}
