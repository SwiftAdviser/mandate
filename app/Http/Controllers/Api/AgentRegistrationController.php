<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use App\Models\AgentApiKey;
use App\Models\Policy;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AgentRegistrationController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'evmAddress' => ['required', 'string', 'regex:/^0x[a-fA-F0-9]{40}$/'],
            'chainId' => ['sometimes', 'integer'],
            'defaultPolicy' => ['sometimes', 'array'],
            'defaultPolicy.spendLimitPerTxUsd' => ['sometimes', 'numeric', 'min:0'],
            'defaultPolicy.spendLimitPerDayUsd' => ['sometimes', 'numeric', 'min:0'],
        ]);

        $claimCode = strtoupper(Str::random(8));

        $agent = Agent::create([
            'name' => $data['name'],
            'evm_address' => strtolower($data['evmAddress']),
            'chain_id' => $data['chainId'] ?? null,
            'claim_code' => $claimCode,
        ]);

        // Default policy
        $policyDefaults = $data['defaultPolicy'] ?? [];
        $defaultPolicy = [
            'spendLimitPerTxUsd' => $policyDefaults['spendLimitPerTxUsd'] ?? 100,
            'spendLimitPerDayUsd' => $policyDefaults['spendLimitPerDayUsd'] ?? 1000,
        ];

        Policy::create([
            'agent_id' => $agent->id,
            'spend_limit_per_tx_usd' => $defaultPolicy['spendLimitPerTxUsd'],
            'spend_limit_per_day_usd' => $defaultPolicy['spendLimitPerDayUsd'],
            'is_active' => true,
        ]);

        [$rawKey] = AgentApiKey::generate($agent);

        $claimUrl = config('mandate.dashboard_url', url('/')).'/claim?code='.$claimCode;

        return response()->json([
            'agentId' => $agent->id,
            'runtimeKey' => $rawKey,
            'claimUrl' => $claimUrl,
            'evmAddress' => $agent->evm_address,
            'chainId' => $agent->chain_id,
            'defaultPolicy' => $defaultPolicy,
        ], 201);
    }

    public function claim(Request $request): JsonResponse
    {
        $data = $request->validate([
            'claimCode' => ['required', 'string'],
        ]);

        $agent = Agent::where('claim_code', strtoupper($data['claimCode']))
            ->whereNull('claimed_at')
            ->first();

        if (! $agent) {
            return response()->json(['error' => 'Invalid or already used claim code.'], 404);
        }

        $agent->update([
            'user_id' => auth()->id(),
            'claimed_at' => now(),
        ]);

        return response()->json([
            'agentId' => $agent->id,
            'claimed' => true,
            'claimedAt' => $agent->claimed_at,
        ]);
    }

    public function destroy(Request $request, string $agentId): JsonResponse
    {
        $agent = Agent::where('id', $agentId)
            ->where('user_id', auth()->id())
            ->first();

        if (! $agent) {
            return response()->json(['error' => 'Agent not found.'], 404);
        }

        $agent->delete();

        return response()->json(['deleted' => true]);
    }

    public function create(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
        ]);

        $agent = Agent::create([
            'user_id' => auth()->id(),
            'name' => $data['name'],
            'claimed_at' => now(),
        ]);

        Policy::create([
            'agent_id' => $agent->id,
            'spend_limit_per_tx_usd' => 100,
            'spend_limit_per_day_usd' => 1000,
            'is_active' => true,
        ]);

        [$rawKey] = AgentApiKey::generate($agent);

        return response()->json([
            'agentId' => $agent->id,
            'runtimeKey' => $rawKey,
        ], 201);
    }
}
