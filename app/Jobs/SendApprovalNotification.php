<?php

namespace App\Jobs;

use App\Models\Agent;
use App\Models\ApprovalQueue;
use App\Services\ApprovalNotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendApprovalNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public int $backoff = 5;

    public function __construct(
        public readonly string $approvalId,
        public readonly string $intentId,
        public readonly string $agentId,
    ) {}

    public function handle(ApprovalNotificationService $service): void
    {
        $approval = ApprovalQueue::find($this->approvalId);
        $agent    = Agent::find($this->agentId);

        if (!$approval || !$agent) {
            Log::warning('SendApprovalNotification: missing approval or agent', [
                'approval_id' => $this->approvalId,
                'agent_id'    => $this->agentId,
            ]);
            return;
        }

        $service->notify($approval, $agent);
    }

    public function failed(\Throwable $e): void
    {
        Log::error('SendApprovalNotification failed permanently', [
            'approval_id' => $this->approvalId,
            'agent_id'    => $this->agentId,
            'error'       => $e->getMessage(),
        ]);
    }
}
