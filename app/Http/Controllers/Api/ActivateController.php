<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Rules\BlockchainAddress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivateController extends Controller
{
    public function activate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'walletAddress' => ['required_without:evmAddress', 'string', new BlockchainAddress],
            'evmAddress' => ['required_without:walletAddress', 'string', 'regex:/^0x[a-fA-F0-9]{40}$/'],
        ]);

        $walletAddress = $data['walletAddress'] ?? $data['evmAddress'];
        $isEvm = str_starts_with($walletAddress, '0x');

        $agent = $request->attributes->get('agent');

        $agent->update([
            'wallet_address' => $isEvm ? strtolower($walletAddress) : $walletAddress,
        ]);

        $dashboardUrl = config('app.url').'/dashboard?onboarding=1';

        return response()->json([
            'activated' => true,
            'agentId' => $agent->id,
            'walletAddress' => $agent->wallet_address,
            'evmAddress' => $agent->wallet_address,
            'onboardingUrl' => $dashboardUrl,
            'message' => 'Agent activated. Tell your human to visit: '.$dashboardUrl,
        ]);
    }
}
