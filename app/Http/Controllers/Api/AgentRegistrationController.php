<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use App\Models\AgentApiKey;
use App\Models\Policy;
use App\Rules\BlockchainAddress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AgentRegistrationController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'walletAddress' => ['required_without:evmAddress', 'string', new BlockchainAddress],
            'evmAddress' => ['required_without:walletAddress', 'string', 'regex:/^0x[a-fA-F0-9]{40}$/'],
            'chainId' => ['sometimes', 'max:32'],
            'defaultPolicy' => ['sometimes', 'array'],
            'defaultPolicy.spendLimitPerTxUsd' => ['sometimes', 'numeric', 'min:0'],
            'defaultPolicy.spendLimitPerDayUsd' => ['sometimes', 'numeric', 'min:0'],
        ]);

        $walletAddress = $data['walletAddress'] ?? $data['evmAddress'];
        $isEvm = str_starts_with($walletAddress, '0x');

        $claimCode = strtoupper(Str::random(8));

        $agent = Agent::create([
            'name' => $data['name'],
            'wallet_address' => $isEvm ? strtolower($walletAddress) : $walletAddress,
            'chain_id' => isset($data['chainId']) ? (string) $data['chainId'] : null,
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
            'walletAddress' => $agent->wallet_address,
            'evmAddress' => $agent->wallet_address,
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

    public function regenerateKey(Request $request, string $agentId): JsonResponse
    {
        $agent = Agent::where('id', $agentId)->first();

        if (! $agent) {
            return response()->json(['error' => 'Agent not found.'], 404);
        }

        if ($agent->user_id !== auth()->id()) {
            return response()->json(['error' => 'Forbidden.'], 403);
        }

        // Revoke all active keys
        AgentApiKey::where('agent_id', $agentId)
            ->whereNull('revoked_at')
            ->update(['revoked_at' => now()]);

        // Generate new key
        [$rawKey] = AgentApiKey::generate($agent);

        return response()->json([
            'runtimeKey' => $rawKey,
        ]);
    }

    public function update(Request $request, string $agentId): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
        ]);

        $agent = Agent::where('id', $agentId)
            ->where('user_id', auth()->id())
            ->first();

        if (! $agent) {
            return response()->json(['error' => 'Agent not found.'], 404);
        }

        $agent->update(['name' => $data['name']]);

        return response()->json(['updated' => true, 'name' => $agent->name]);
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
