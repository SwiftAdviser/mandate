<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use App\Models\PolicyInsight;
use App\Services\PolicyInsightService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InsightController extends Controller
{
    public function __construct(private PolicyInsightService $service) {}

    public function index(Request $request): JsonResponse
    {
        $userId = auth()->id();
        $agentIds = Agent::where('user_id', $userId)->pluck('id');

        $insights = PolicyInsight::whereIn('agent_id', $agentIds)
            ->where('status', PolicyInsight::STATUS_ACTIVE)
            ->where('confidence', '>=', 0.6)
            ->orderByDesc('confidence')
            ->get();

        return response()->json(['insights' => $insights]);
    }

    public function accept(Request $request, string $id): JsonResponse
    {
        $insight = $this->findOwnedInsight($id);

        if ($insight->status !== PolicyInsight::STATUS_ACTIVE) {
            return response()->json(['error' => 'Insight is not active.'], 409);
        }

        $this->service->applyInsight($insight);

        return response()->json($insight->fresh());
    }

    public function dismiss(Request $request, string $id): JsonResponse
    {
        $insight = $this->findOwnedInsight($id);

        if ($insight->status !== PolicyInsight::STATUS_ACTIVE) {
            return response()->json(['error' => 'Insight is not active.'], 409);
        }

        $this->service->dismissInsight($insight);

        return response()->json($insight->fresh());
    }

    private function findOwnedInsight(string $id): PolicyInsight
    {
        $userId = auth()->id();
        $agentIds = Agent::where('user_id', $userId)->pluck('id');

        return PolicyInsight::whereIn('agent_id', $agentIds)->findOrFail($id);
    }
}
