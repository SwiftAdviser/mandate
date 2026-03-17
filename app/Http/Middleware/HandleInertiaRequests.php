<?php

namespace App\Http\Middleware;

use App\Models\Agent;
use App\Models\ApprovalQueue;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    public function share(Request $request): array
    {
        $user = $request->user();

        $pendingApprovals = 0;
        $agentActivated = false;
        if ($user) {
            $pendingApprovals = ApprovalQueue::whereHas('agent', fn ($q) => $q->where('user_id', $user->id))
                ->where('status', ApprovalQueue::STATUS_PENDING)
                ->where('expires_at', '>', now())
                ->count();

            $agentActivated = Agent::where('user_id', $user->id)
                ->whereNotNull('evm_address')
                ->exists();
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
            'agent_activated' => $agentActivated,
            'app_url' => config('app.url'),
        ]);
    }
}
