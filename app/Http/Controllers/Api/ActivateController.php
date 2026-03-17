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
            'evm_address' => strtolower($data['evmAddress']),
        ]);

        return response()->json([
            'activated' => true,
            'agentId' => $agent->id,
            'evmAddress' => $agent->evm_address,
        ]);
    }
}
