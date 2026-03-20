<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\RecordDecisionSignal;
use App\Models\ApprovalQueue;
use App\Models\TxIntent;
use App\Services\IntentStateMachineService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ApprovalController extends Controller
{
    public function __construct(private IntentStateMachineService $stateMachine) {}

    public function index(Request $request): JsonResponse
    {
        $userId = auth()->id();

        $pending = ApprovalQueue::with(['intent', 'agent'])
            ->whereHas('agent', fn ($q) => $q->where('user_id', $userId))
            ->where('status', ApprovalQueue::STATUS_PENDING)
            ->where('expires_at', '>', now())
            ->orderBy('created_at')
            ->paginate(20);

        return response()->json($pending);
    }

    public function decide(Request $request, string $approvalId): JsonResponse
    {
        $data = $request->validate([
            'decision' => ['required', 'in:approved,rejected'],
            'note' => ['sometimes', 'string', 'max:500'],
        ]);

        $approval = ApprovalQueue::with('intent')->findOrFail($approvalId);

        if ($approval->status !== ApprovalQueue::STATUS_PENDING) {
            return response()->json(['error' => 'Approval already decided.'], 409);
        }

        if ($approval->expires_at->isPast()) {
            return response()->json(['error' => 'Approval request has expired.'], 410);
        }

        $userId = auth()->id();
        $intent = $approval->intent;

        $approval->update([
            'status' => $data['decision'],
            'decided_by_user_id' => $userId,
            'decision_note' => $data['note'] ?? null,
            'decided_at' => now(),
        ]);

        $newIntentStatus = $data['decision'] === 'approved'
            ? TxIntent::STATUS_APPROVED
            : TxIntent::STATUS_FAILED;

        $this->stateMachine->transition($intent, $newIntentStatus, $userId, 'user', [
            'approval_id' => $approvalId,
            'decision' => $data['decision'],
            'note' => $data['note'] ?? null,
        ]);

        RecordDecisionSignal::dispatch($intent->id, $data['decision'], $data['note'] ?? null);

        return response()->json([
            'approvalId' => $approvalId,
            'intentId' => $intent->id,
            'decision' => $data['decision'],
            'intentStatus' => $newIntentStatus,
        ]);
    }
}
