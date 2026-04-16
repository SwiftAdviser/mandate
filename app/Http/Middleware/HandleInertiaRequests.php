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
                ->whereNotNull('wallet_address')
                ->exists();

            $activeInsightsCount = PolicyInsight::whereIn('agent_id', $agentIds)
                ->where('status', PolicyInsight::STATUS_ACTIVE)
                ->where('confidence', '>=', config('mandate.insights.min_confidence'))
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
                    'google_id' => $user->google_id,
                    'email_verified' => (bool) $user->email_verified_at,
                ] : null,
            ],
            'flash' => [
                'error' => $request->session()->get('error'),
                'success' => $request->session()->get('success'),
            ],
            'pending_approvals' => $pendingApprovals,
            'active_insights_count' => $activeInsightsCount,
            'agent_activated' => $agentActivated,
            'is_admin' => $user && config('mandate.admin_user_id') && (string) $user->id === (string) config('mandate.admin_user_id'),
            'app_url' => config('app.url'),
        ]);
    }
}
