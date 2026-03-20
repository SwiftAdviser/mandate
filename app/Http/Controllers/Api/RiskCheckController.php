<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AegisService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RiskCheckController extends Controller
{
    public function __construct(private AegisService $aegis) {}

    public function check(Request $request): JsonResponse
    {
        $data = $request->validate([
            'to' => ['required', 'string', 'regex:/^0x[a-fA-F0-9]{40}$/'],
            'chainId' => ['required', 'integer'],
            'calldata' => ['sometimes', 'string'],
            'value' => ['sometimes', 'string'],
            'from' => ['sometimes', 'string', 'regex:/^0x[a-fA-F0-9]{40}$/'],
        ]);

        $result = $this->aegis->check(
            to: $data['to'],
            chainId: $data['chainId'],
            calldata: $data['calldata'] ?? '0x',
            value: $data['value'] ?? '0',
            from: $data['from'] ?? '0x0000000000000000000000000000000000000000',
        );

        return response()->json($result);
    }
}
