<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Rules\BlockchainAddress;
use App\Services\PolicyEngineService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ValidateController extends Controller
{
    public function __construct(private PolicyEngineService $engine) {}

    /**
     * Primary chain-agnostic validation endpoint.
     * Checks: circuit breaker, schedule, allowlist, blocked actions, quotas,
     * address risk, reputation, reason scanner, approval gates.
     */
    public function validate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'action' => ['required', 'string', 'max:100'],
            'amount' => ['sometimes', 'string'],
            'to' => ['sometimes', 'string', new BlockchainAddress],
            'token' => ['sometimes', 'string', 'max:20'],
            'reason' => ['required', 'string', 'max:1000'],
            'chain' => ['sometimes', 'string', 'max:32'],
        ]);

        $agent = $request->attributes->get('agent');

        $result = $this->engine->validate($agent, $data);

        // Hard block (policy violation)
        if (! $result['allowed'] && ! ($result['requiresApproval'] ?? false)) {
            return response()->json([
                'allowed' => false,
                'blockReason' => $result['blockReason'],
                'blockDetail' => $result['blockDetail'] ?? null,
                'declineMessage' => $result['declineMessage'] ?? null,
                'action' => $data['action'],
            ], 422);
        }

        // Approval required: accepted but pending human review
        if ($result['requiresApproval'] ?? false) {
            return response()->json([
                'allowed' => false,
                'intentId' => $result['intentId'],
                'action' => $data['action'],
                'requiresApproval' => true,
                'approvalId' => $result['approvalId'],
                'approvalReason' => $result['approvalReason'] ?? null,
                'instruction' => 'Transaction requires human approval. The wallet owner has been notified. Poll GET /api/intents/'.$result['intentId'].'/status to check approval status.',
            ], 202);
        }

        return response()->json([
            'allowed' => true,
            'intentId' => $result['intentId'],
            'action' => $data['action'],
            'requiresApproval' => false,
        ]);
    }

    /**
     * Legacy raw EVM validation (deprecated).
     * Full tx params + intentHash verification.
     */
    public function rawValidate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'chainId' => ['required', 'integer'],
            'nonce' => ['required', 'integer', 'min:0'],
            'to' => ['required', 'string', 'regex:/^0x[a-fA-F0-9]{40}$/'],
            'calldata' => ['sometimes', 'string'],
            'valueWei' => ['sometimes', 'string'],
            'gasLimit' => ['required', 'string'],
            'maxFeePerGas' => ['required', 'string'],
            'maxPriorityFeePerGas' => ['required', 'string'],
            'txType' => ['sometimes', 'integer'],
            'accessList' => ['sometimes', 'array'],
            'intentHash' => ['required', 'string', 'regex:/^0x[a-fA-F0-9]{64}$/'],
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        $agent = $request->attributes->get('agent');

        // Auto-fill agent address/chain on first validate call
        if ($agent->wallet_address === null && isset($data['to'])) {
            $agent->update(['wallet_address' => strtolower($data['to'])]);
        }
        if ($agent->chain_id === null && isset($data['chainId'])) {
            $agent->update(['chain_id' => (string) $data['chainId']]);
        }

        $result = $this->engine->rawValidate($agent, $data);

        if (! $result['allowed'] && $result['intentId'] === null) {
            return response()->json([
                'allowed' => false,
                'blockReason' => $result['blockReason'],
                'blockDetail' => $result['blockDetail'] ?? null,
                'declineMessage' => $result['declineMessage'] ?? null,
            ], 422);
        }

        return response()->json([
            'allowed' => $result['allowed'],
            'intentId' => $result['intentId'],
            'chain' => (string) $data['chainId'],
            'requiresApproval' => $result['requiresApproval'],
            'approvalId' => $result['approvalId'],
            'approvalReason' => $result['approvalReason'] ?? null,
            'blockReason' => $result['blockReason'],
            'riskLevel' => $result['riskLevel'] ?? null,
            'riskDegraded' => $result['riskDegraded'] ?? false,
        ]);
    }
}
