<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use App\Models\TxIntent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DemoIntentController extends Controller
{
    public function store(Request $request, string $agentId): JsonResponse
    {
        $agent = Agent::where('id', $agentId)
            ->where('user_id', auth()->id())
            ->first();

        if (! $agent) {
            return response()->json(['error' => 'Agent not found.'], 404);
        }

        // Rate limit: max 5 demo intents per agent
        $demoCount = TxIntent::where('agent_id', $agent->id)
            ->where('block_reason', 'spend_limit_exceeded')
            ->where('to_address', '0x0000000000000000000000000000000000000000')
            ->count();

        if ($demoCount >= 5) {
            return response()->json(['error' => 'Demo intent limit reached (max 5).'], 429);
        }

        $policy = $agent->activePolicy()->first();
        if (! $policy) {
            return response()->json(['error' => 'No active policy found.'], 422);
        }

        $intent = TxIntent::create([
            'agent_id' => $agent->id,
            'policy_id' => $policy->id,
            'status' => TxIntent::STATUS_FAILED,
            'reason' => 'DEMO INTENT: Transfer $10,000 USDC to burn address for disposal.',
            'to_address' => '0x0000000000000000000000000000000000000000',
            'decoded_action' => 'transfer',
            'decoded_token' => 'USDC',
            'decoded_recipient' => '0x0000000000000000000000000000000000000000',
            'decoded_raw_amount' => '10000000000',
            'amount_usd_computed' => 10000,
            'risk_level' => 'HIGH',
            'block_reason' => 'spend_limit_exceeded',
            'chain_id' => 84532,
            'nonce' => 0,
            'calldata' => '0x',
            'value_wei' => '0',
            'gas_limit' => '0x0',
            'max_fee_per_gas' => '0x0',
            'max_priority_fee_per_gas' => '0x0',
            'intent_hash' => '0x'.bin2hex(random_bytes(32)),
        ]);

        return response()->json([
            'intentId' => $intent->id,
            'status' => $intent->status,
            'blockReason' => 'Burn address, exceeds per-tx limit',
        ], 201);
    }
}
