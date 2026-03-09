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
            'name'                             => ['required', 'string', 'max:100'],
            'evmAddress'                       => ['required', 'string', 'regex:/^0x[a-fA-F0-9]{40}$/'],
            'chainId'                          => ['required', 'integer'],
            'defaultPolicy'                    => ['sometimes', 'array'],
            'defaultPolicy.spendLimitPerTxUsd' => ['sometimes', 'numeric', 'min:0'],
            'defaultPolicy.spendLimitPerDayUsd'=> ['sometimes', 'numeric', 'min:0'],
        ]);

        $claimCode = strtoupper(Str::random(8));

        $agent = Agent::create([
            'name'        => $data['name'],
            'evm_address' => strtolower($data['evmAddress']),
            'chain_id'    => $data['chainId'],
            'claim_code'  => $claimCode,
        ]);

        // Default policy
        $policyDefaults = $data['defaultPolicy'] ?? [];
        Policy::create([
            'agent_id'                => $agent->id,
            'spend_limit_per_tx_usd'  => $policyDefaults['spendLimitPerTxUsd'] ?? 100,
            'spend_limit_per_day_usd' => $policyDefaults['spendLimitPerDayUsd'] ?? 1000,
            'is_active'               => true,
        ]);

        [$rawKey] = AgentApiKey::generate($agent);

        $claimUrl = config('mandate.dashboard_url', url('/')) . '/claim?code=' . $claimCode;

        return response()->json([
            'agentId'    => $agent->id,
            'runtimeKey' => $rawKey,
            'claimUrl'   => $claimUrl,
            'evmAddress' => $agent->evm_address,
            'chainId'    => $agent->chain_id,
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

        if (!$agent) {
            return response()->json(['error' => 'Invalid or already used claim code.'], 404);
        }

        $privyDid = $request->attributes->get('privy_did');

        $agent->update([
            'org_id'     => $privyDid, // link to Privy user
            'claimed_at' => now(),
        ]);

        return response()->json([
            'agentId'   => $agent->id,
            'claimed'   => true,
            'claimedAt' => $agent->claimed_at,
        ]);
    }
}
