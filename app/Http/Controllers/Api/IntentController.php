<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\VerifyIntentEnvelope;
use App\Models\TxIntent;
use App\Services\CircuitBreakerService;
use App\Services\IntentStateMachineService;
use App\Services\IntentSummaryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IntentController extends Controller
{
    public function __construct(
        private IntentStateMachineService $stateMachine,
        private CircuitBreakerService $circuitBreaker,
        private IntentSummaryService $summary,
    ) {}

    /**
     * POST /api/intents/{id}/events — agent posts txHash after broadcast
     */
    public function postEvent(Request $request, string $intentId): JsonResponse
    {
        $agent = $request->attributes->get('agent');
        $intent = TxIntent::where('id', $intentId)
            ->where('agent_id', $agent->id)
            ->first();

        if (! $intent) {
            return response()->json(['error' => 'Intent not found.'], 404);
        }

        if ($intent->isTerminal()) {
            return response()->json(['error' => 'Intent is already in terminal state.', 'status' => $intent->status], 409);
        }

        $data = $request->validate([
            'txHash' => ['required', 'string', 'regex:/^0x[a-fA-F0-9]{64}$/'],
        ]);

        if (! in_array($intent->status, [TxIntent::STATUS_RESERVED, TxIntent::STATUS_APPROVED], true)) {
            return response()->json([
                'error' => 'Intent must be in reserved or approved state to post a txHash.',
                'status' => $intent->status,
            ], 409);
        }

        $intent->update(['tx_hash' => $data['txHash']]);

        $this->stateMachine->transition(
            $intent,
            TxIntent::STATUS_BROADCASTED,
            $agent->id,
            'agent',
            ['tx_hash' => $data['txHash']]
        );

        // Dispatch async envelope verification
        VerifyIntentEnvelope::dispatch($intent->id, $data['txHash']);

        return response()->json([
            'intentId' => $intent->id,
            'status' => TxIntent::STATUS_BROADCASTED,
            'txHash' => $data['txHash'],
        ]);
    }

    /**
     * GET /api/intents/{id}/status
     */
    public function status(Request $request, string $intentId): JsonResponse
    {
        $agent = $request->attributes->get('agent');
        $intent = TxIntent::where('id', $intentId)
            ->where('agent_id', $agent->id)
            ->first();

        if (! $intent) {
            return response()->json(['error' => 'Intent not found.'], 404);
        }

        return response()->json([
            'intentId' => $intent->id,
            'status' => $intent->status,
            'txHash' => $intent->tx_hash,
            'blockNumber' => $intent->block_number,
            'gasUsed' => $intent->gas_used,
            'amountUsd' => $intent->amount_usd_computed,
            'decodedAction' => $intent->decoded_action,
            'summary' => $this->summary->summarize($intent),
            'blockReason' => $intent->block_reason,
            'requiresApproval' => $intent->status === TxIntent::STATUS_APPROVAL_PENDING,
            'approvalId' => $intent->approvalQueue?->id,
            'expiresAt' => $intent->expires_at,
        ]);
    }

    /**
     * POST /api/intents/{id}/cancel — admin only
     */
    public function cancel(Request $request, string $intentId): JsonResponse
    {
        $userId = auth()->id();
        $intent = TxIntent::find($intentId);

        if (! $intent || $intent->isTerminal()) {
            return response()->json(['error' => 'Intent not found or already terminal.'], 404);
        }

        $this->stateMachine->transition($intent, TxIntent::STATUS_FAILED, $userId, 'user', [
            'block_reason' => 'Cancelled by operator',
        ]);

        return response()->json(['intentId' => $intent->id, 'status' => TxIntent::STATUS_FAILED]);
    }
}
