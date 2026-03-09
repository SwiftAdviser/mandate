<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use App\Services\CircuitBreakerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CircuitBreakerController extends Controller
{
    public function __construct(private CircuitBreakerService $cb) {}

    public function toggle(Request $request, string $agentId): JsonResponse
    {
        $agent    = Agent::findOrFail($agentId);
        $active   = $this->cb->toggle($agent);
        $agent->refresh();

        return response()->json([
            'agentId'              => $agent->id,
            'circuitBreakerActive' => $active,
            'reason'               => $agent->circuit_breaker_reason,
        ]);
    }

    public function status(Request $request, string $agentId): JsonResponse
    {
        $agent = Agent::findOrFail($agentId);
        return response()->json([
            'agentId'              => $agent->id,
            'circuitBreakerActive' => $agent->circuit_breaker_active,
            'trippedAt'            => $agent->circuit_breaker_tripped_at,
            'reason'               => $agent->circuit_breaker_reason,
        ]);
    }
}
