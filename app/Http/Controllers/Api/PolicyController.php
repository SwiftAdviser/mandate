<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use App\Models\Policy;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PolicyController extends Controller
{
    public function index(Request $request, string $agentId): JsonResponse
    {
        $agent = Agent::where('id', $agentId)->where('user_id', auth()->id())->firstOrFail();
        $policies = $agent->policies()->orderByDesc('created_at')->get();

        return response()->json(['policies' => $policies]);
    }

    public function store(Request $request, string $agentId): JsonResponse
    {
        $agent = Agent::where('id', $agentId)->where('user_id', auth()->id())->firstOrFail();

        $data = $request->validate([
            'spendLimitPerTxUsd'      => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'spendLimitPerDayUsd'     => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'spendLimitPerMonthUsd'   => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'allowedAddresses'        => ['sometimes', 'nullable', 'array'],
            'allowedContracts'        => ['sometimes', 'nullable', 'array'],
            'blockedSelectors'        => ['sometimes', 'nullable', 'array'],
            'requireApprovalSelectors'=> ['sometimes', 'nullable', 'array'],
            'requireApprovalAboveUsd' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'maxSlippageBps'          => ['sometimes', 'nullable', 'integer', 'min:0'],
            'maxGasLimit'             => ['sometimes', 'nullable', 'string'],
            'maxValueWei'             => ['sometimes', 'nullable', 'string'],
            'schedule'                => ['sometimes', 'nullable', 'array'],
        ]);

        // Deactivate current active policy
        $agent->policies()->where('is_active', true)->update(['is_active' => false]);

        $policy = Policy::create([
            'agent_id'                    => $agent->id,
            'spend_limit_per_tx_usd'      => $data['spendLimitPerTxUsd'] ?? null,
            'spend_limit_per_day_usd'     => $data['spendLimitPerDayUsd'] ?? null,
            'spend_limit_per_month_usd'   => $data['spendLimitPerMonthUsd'] ?? null,
            'allowed_addresses'           => $data['allowedAddresses'] ?? null,
            'allowed_contracts'           => $data['allowedContracts'] ?? null,
            'blocked_selectors'           => $data['blockedSelectors'] ?? null,
            'require_approval_selectors'  => $data['requireApprovalSelectors'] ?? null,
            'require_approval_above_usd'  => $data['requireApprovalAboveUsd'] ?? null,
            'max_slippage_bps'            => $data['maxSlippageBps'] ?? null,
            'max_gas_limit'               => $data['maxGasLimit'] ?? null,
            'max_value_wei'               => $data['maxValueWei'] ?? null,
            'schedule'                    => $data['schedule'] ?? null,
            'is_active'                   => true,
            'version'                     => ($agent->policies()->max('version') ?? 0) + 1,
        ]);

        return response()->json($policy, 201);
    }

    public function show(string $agentId, string $policyId): JsonResponse
    {
        Agent::where('id', $agentId)->where('user_id', auth()->id())->firstOrFail();
        $policy = Policy::where('agent_id', $agentId)->findOrFail($policyId);

        return response()->json($policy);
    }
}
