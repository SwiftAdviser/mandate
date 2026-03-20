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
            'spendLimitPerTxUsd' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'spendLimitPerDayUsd' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'spendLimitPerMonthUsd' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'allowedAddresses' => ['sometimes', 'nullable', 'array'],
            'allowedContracts' => ['sometimes', 'nullable', 'array'],
            'blockedSelectors' => ['sometimes', 'nullable', 'array'],
            'blockedActions' => ['sometimes', 'nullable', 'array'],
            'requireApprovalSelectors' => ['sometimes', 'nullable', 'array'],
            'requireApprovalActions' => ['sometimes', 'nullable', 'array'],
            'requireApprovalAboveUsd' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'maxSlippageBps' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'maxGasLimit' => ['sometimes', 'nullable', 'string'],
            'maxValueWei' => ['sometimes', 'nullable', 'string'],
            'schedule' => ['sometimes', 'nullable', 'array'],
            'guardRules' => ['sometimes', 'nullable', 'string', 'max:10000'],
        ]);

        // Carry forward values from current active policy for fields not in the request
        $prev = $agent->policies()->where('is_active', true)->first();

        $carry = fn (string $camel, string $snake) => array_key_exists($camel, $data) ? $data[$camel] : $prev?->$snake;

        // Deactivate current active policy
        $agent->policies()->where('is_active', true)->update(['is_active' => false]);

        $policy = Policy::create([
            'agent_id' => $agent->id,
            'spend_limit_per_tx_usd' => $carry('spendLimitPerTxUsd', 'spend_limit_per_tx_usd'),
            'spend_limit_per_day_usd' => $carry('spendLimitPerDayUsd', 'spend_limit_per_day_usd'),
            'spend_limit_per_month_usd' => $carry('spendLimitPerMonthUsd', 'spend_limit_per_month_usd'),
            'allowed_addresses' => $carry('allowedAddresses', 'allowed_addresses'),
            'allowed_contracts' => $carry('allowedContracts', 'allowed_contracts'),
            'blocked_selectors' => $carry('blockedSelectors', 'blocked_selectors'),
            'blocked_actions' => $carry('blockedActions', 'blocked_actions'),
            'require_approval_selectors' => $carry('requireApprovalSelectors', 'require_approval_selectors'),
            'require_approval_actions' => $carry('requireApprovalActions', 'require_approval_actions'),
            'require_approval_above_usd' => $carry('requireApprovalAboveUsd', 'require_approval_above_usd'),
            'max_slippage_bps' => $carry('maxSlippageBps', 'max_slippage_bps'),
            'max_gas_limit' => $carry('maxGasLimit', 'max_gas_limit'),
            'max_value_wei' => $carry('maxValueWei', 'max_value_wei'),
            'schedule' => $carry('schedule', 'schedule'),
            'guard_rules' => $carry('guardRules', 'guard_rules'),
            'is_active' => true,
            'version' => ($agent->policies()->max('version') ?? 0) + 1,
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
