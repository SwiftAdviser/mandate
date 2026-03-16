<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use App\Services\ApprovalNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AgentWebhookController extends Controller
{
    public function index(string $agentId): JsonResponse
    {
        $agent = Agent::findOrFail($agentId);

        return response()->json([
            'webhooks' => $agent->notification_webhooks ?? [],
        ]);
    }

    public function update(string $agentId, Request $request): JsonResponse
    {
        $request->validate([
            'webhooks'             => 'required|array',
            'webhooks.*.type'      => 'required|string|in:slack,telegram,custom',
            'webhooks.*.url'       => 'required_if:webhooks.*.type,slack,custom|string|url',
            'webhooks.*.chat_id'   => 'required_if:webhooks.*.type,telegram|string',
            'webhooks.*.bot_token' => 'required_if:webhooks.*.type,telegram|string',
            'webhooks.*.secret'    => 'nullable|string',
        ]);

        $agent = Agent::findOrFail($agentId);
        $agent->update(['notification_webhooks' => $request->input('webhooks')]);

        return response()->json([
            'webhooks' => $agent->notification_webhooks,
        ]);
    }

    public function test(string $agentId, ApprovalNotificationService $service): JsonResponse
    {
        $agent = Agent::findOrFail($agentId);

        if (empty($agent->notification_webhooks)) {
            return response()->json(['error' => 'No webhooks configured'], 422);
        }

        $service->sendTest($agent);

        return response()->json(['message' => 'Test notifications sent']);
    }
}
