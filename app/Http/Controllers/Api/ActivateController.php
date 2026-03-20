<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivateController extends Controller
{
    public function activate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'evmAddress' => ['required', 'string', 'regex:/^0x[a-fA-F0-9]{40}$/'],
        ]);

        $agent = $request->attributes->get('agent');

        $agent->update([
            'wallet_address' => strtolower($data['evmAddress']),
        ]);

        $dashboardUrl = config('app.url').'/dashboard?onboarding=1';

        return response()->json([
            'activated' => true,
            'agentId' => $agent->id,
            'evmAddress' => $agent->wallet_address,
            'onboardingUrl' => $dashboardUrl,
            'message' => 'Agent activated. Tell your human to visit: '.$dashboardUrl,
        ]);
    }
}
