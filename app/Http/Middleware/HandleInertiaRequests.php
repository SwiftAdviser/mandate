<?php

namespace App\Http\Middleware;

use App\Models\Agent;
use App\Models\ApprovalQueue;
use App\Models\PolicyInsight;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    public function share(Request $request): array
    {
        $user = $request->user();

        $pendingApprovals = 0;
        $agentActivated = false;
        $activeInsightsCount = 0;
        if ($user) {
            $agentIds = Agent::where('user_id', $user->id)->pluck('id');

            $pendingApprovals = ApprovalQueue::whereIn('agent_id', $agentIds)
                ->where('status', ApprovalQueue::STATUS_PENDING)
                ->where('expires_at', '>', now())
                ->count();

            $agentActivated = Agent::where('user_id', $user->id)
                ->whereNotNull('evm_address')
                ->exists();

            $activeInsightsCount = PolicyInsight::whereIn('agent_id', $agentIds)
                ->where('status', PolicyInsight::STATUS_ACTIVE)
                ->where('confidence', '>=', 0.4)
                ->count();
        }

        return array_merge(parent::share($request), [
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'avatar_url' => $user->avatar_url,
                    'github_id' => $user->github_id,
                ] : null,
            ],
            'pending_approvals' => $pendingApprovals,
            'active_insights_count' => $activeInsightsCount,
            'agent_activated' => $agentActivated,
            'app_url' => config('app.url'),
        ]);
    }
}
