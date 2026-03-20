<?php

namespace App\Jobs;

use App\Models\Agent;
use App\Models\PolicyInsight;
use App\Services\InsightNotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendInsightNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public int $backoff = 5;

    public function __construct(
        public readonly string $insightId,
        public readonly string $agentId,
    ) {}

    public function handle(InsightNotificationService $service): void
    {
        $insight = PolicyInsight::find($this->insightId);
        $agent   = Agent::find($this->agentId);

        if (!$insight || !$agent) {
            Log::warning('SendInsightNotification: missing insight or agent', [
                'insight_id' => $this->insightId,
                'agent_id'   => $this->agentId,
            ]);
            return;
        }

        $service->notify($insight, $agent);
    }

    public function failed(\Throwable $e): void
    {
        Log::error('SendInsightNotification failed', [
            'insight_id' => $this->insightId,
            'agent_id'   => $this->agentId,
            'error'      => $e->getMessage(),
        ]);
    }
}
