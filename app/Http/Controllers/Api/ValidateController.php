<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PolicyEngineService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ValidateController extends Controller
{
    public function __construct(private PolicyEngineService $engine) {}

    /**
     * Lightweight pre-flight check for custodial wallets (Locus, Bankr, Sponge).
     * No intentHash, no tx details. Checks: circuit breaker, schedule, allowlist,
     * quotas, reason scanner. Creates an audit trail intent with action field.
     */
    public function preflight(Request $request): JsonResponse
    {
        $data = $request->validate([
            'action' => ['required', 'string', 'max:100'],
            'amount' => ['sometimes', 'string'],
            'to' => ['sometimes', 'string', 'regex:/^0x[a-fA-F0-9]{40}$/'],
            'token' => ['sometimes', 'string', 'max:20'],
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        $agent = $request->attributes->get('agent');

        $result = $this->engine->preflight($agent, $data);

        if (! $result['allowed']) {
            return response()->json([
                'allowed' => false,
                'blockReason' => $result['blockReason'],
                'blockDetail' => $result['blockDetail'] ?? null,
                'declineMessage' => $result['declineMessage'] ?? null,
                'action' => $data['action'],
            ], 422);
        }

        return response()->json([
            'allowed' => true,
            'intentId' => $result['intentId'],
            'action' => $data['action'],
            'requiresApproval' => $result['requiresApproval'] ?? false,
            'approvalId' => $result['approvalId'] ?? null,
        ]);
    }

    public function validate(Request $request): JsonResponse
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
        if ($agent->evm_address === null && isset($data['to'])) {
            $agent->update(['evm_address' => strtolower($data['to'])]);
        }
        if ($agent->chain_id === null && isset($data['chainId'])) {
            $agent->update(['chain_id' => $data['chainId']]);
        }

        $result = $this->engine->validate($agent, $data);

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
            'requiresApproval' => $result['requiresApproval'],
            'approvalId' => $result['approvalId'],
            'approvalReason' => $result['approvalReason'] ?? null,
            'blockReason' => $result['blockReason'],
            'riskLevel' => $result['riskLevel'] ?? null,
            'riskDegraded' => $result['riskDegraded'] ?? false,
        ]);
    }
}
