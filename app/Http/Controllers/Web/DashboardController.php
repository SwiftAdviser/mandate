<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use App\Models\ApprovalQueue;
use App\Models\PolicyInsight;
use App\Models\TxIntent;
use App\Services\IntentSummaryService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function dashboard(Request $request): Response
    {
        $userId = auth()->id();

        $agents = Agent::where('user_id', $userId)->get();
        $firstVisitKey = null;
        $needsOnboarding = $request->query('onboarding') === '1';

        // No auto-create: agents register via plugin/SDK (POST /api/agents/register)
        // or via dashboard "Create Agent" button

        // When onboarding, select most recently claimed agent and clear first_agent_key
        if ($needsOnboarding) {
            $request->session()->forget('first_agent_key');
            $selectedAgent = $agents->sortByDesc('claimed_at')->first();
        } else {
            $selectedAgent = $agents->first();
        }

        // Show activation block until agent makes its first API call (wallet_address gets filled)
        if (! $needsOnboarding && $selectedAgent && $selectedAgent->wallet_address === null && $request->session()->has('first_agent_key')) {
            $firstVisitKey = $request->session()->get('first_agent_key');
        }

        // Agent activated: clear session key
        if ($selectedAgent && $selectedAgent->wallet_address !== null) {
            $request->session()->forget('first_agent_key');
        }

        $dailyQuota = null;
        $monthlyQuota = null;
        $recentIntents = collect();
        $totalToday = 0;
        $pendingApprovals = 0;

        $topInsight = null;

        if ($selectedAgent) {
            $topInsight = PolicyInsight::where('agent_id', $selectedAgent->id)
                ->where('status', PolicyInsight::STATUS_ACTIVE)
                ->where('confidence', '>=', 0.4)
                ->orderByDesc('confidence')
                ->first();

            $dailyQuota = \DB::table('quota_reservations')
                ->where('agent_id', $selectedAgent->id)
                ->where('window_type', 'daily')
                ->where('window_key', now()->format('Y-m-d'))
                ->first();

            $monthlyQuota = \DB::table('quota_reservations')
                ->where('agent_id', $selectedAgent->id)
                ->where('window_type', 'monthly')
                ->where('window_key', now()->format('Y-m'))
                ->first();

            $summaryService = app(IntentSummaryService::class);
            $recentIntents = TxIntent::where('agent_id', $selectedAgent->id)
                ->orderByDesc('created_at')
                ->limit(20)
                ->get(['id', 'decoded_action', 'decoded_token', 'decoded_raw_amount', 'decoded_recipient', 'amount_usd_computed', 'status', 'to_address', 'created_at', 'tx_hash', 'chain_id', 'value_wei', 'calldata', 'risk_level', 'reason'])
                ->map(fn ($i) => array_merge($i->toArray(), ['summary' => $summaryService->summarize($i)]));

            $totalToday = TxIntent::where('agent_id', $selectedAgent->id)
                ->where('status', TxIntent::STATUS_CONFIRMED)
                ->whereDate('created_at', today())
                ->sum('amount_usd_computed');

            $pendingApprovals = ApprovalQueue::whereHas('agent', fn ($q) => $q->where('user_id', $userId))
                ->where('status', ApprovalQueue::STATUS_PENDING)
                ->where('expires_at', '>', now())
                ->count();
        }

        return Inertia::render('Dashboard', [
            'agents' => $agents,
            'selected_agent' => $selectedAgent,
            'daily_quota' => $dailyQuota,
            'monthly_quota' => $monthlyQuota,
            'recent_intents' => $recentIntents,
            'total_confirmed_today' => (float) $totalToday,
            'pending_approvals' => $pendingApprovals,
            'needs_onboarding' => $needsOnboarding,
            'first_visit_key' => $firstVisitKey,
            'top_insight' => $topInsight,
        ]);
    }

    public function agents(Request $request): Response
    {
        $agents = Agent::where('user_id', auth()->id())
            ->with('activeApiKey')
            ->orderByDesc('created_at')
            ->get();

        return Inertia::render('Agents', ['agents' => $agents]);
    }

    public function audit(Request $request): Response
    {
        $userId = auth()->id();
        $agentIds = Agent::where('user_id', $userId)->pluck('id');

        $summaryService = app(IntentSummaryService::class);
        $intents = TxIntent::whereIn('agent_id', $agentIds)
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->action, fn ($q, $a) => $q->where('decoded_action', $a))
            ->orderByDesc('created_at')
            ->paginate(50, ['id', 'decoded_action', 'decoded_token', 'decoded_raw_amount', 'decoded_recipient', 'amount_usd_computed', 'status', 'to_address', 'created_at', 'tx_hash', 'chain_id', 'intent_hash', 'value_wei', 'calldata', 'risk_level', 'reason', 'block_reason']);

        $intents->through(fn ($i) => array_merge($i->toArray(), ['summary' => $summaryService->summarize($i)]));

        return Inertia::render('AuditLog', [
            'intents' => $intents,
            'filters' => ['status' => $request->status ?? '', 'action' => $request->action ?? ''],
        ]);
    }

    public function approvals(Request $request): Response
    {
        $userId = auth()->id();

        $summaryService = app(IntentSummaryService::class);
        $approvals = ApprovalQueue::with(['intent', 'agent'])
            ->whereHas('agent', fn ($q) => $q->where('user_id', $userId))
            ->where('status', ApprovalQueue::STATUS_PENDING)
            ->where('expires_at', '>', now())
            ->orderBy('created_at')
            ->paginate(20);

        $approvals->through(function ($a) use ($summaryService) {
            if ($a->intent) {
                $a->intent->setAttribute('summary', $summaryService->summarize($a->intent));
            }

            return $a;
        });

        return Inertia::render('Approvals', ['approvals' => $approvals]);
    }

    public function policies(Request $request): Response
    {
        $userId = auth()->id();

        $agent = Agent::where('user_id', $userId)->first();
        $currentPolicy = $agent?->activePolicy()->first();

        return Inertia::render('PolicyBuilder', [
            'agent_id' => $agent?->id ?? '',
            'current_policy' => $currentPolicy,
        ]);
    }

    public function mandate(Request $request): Response
    {
        $userId = auth()->id();
        $agent = Agent::where('user_id', $userId)->first();
        $currentPolicy = $agent?->activePolicy()->first();

        return Inertia::render('MandateMd', [
            'agent_id' => $agent?->id ?? '',
            'guard_rules' => $currentPolicy?->guard_rules,
        ]);
    }

    public function notifications(Request $request): Response
    {
        $userId = auth()->id();
        $agent = Agent::where('user_id', $userId)->first();

        $webhooks = $agent?->notification_webhooks ?? [];
        $telegramLinks = collect($webhooks)
            ->where('type', 'telegram')
            ->map(fn ($w) => [
                'chat_id' => $w['chat_id'] ?? null,
                'username' => $w['username'] ?? null,
            ])
            ->filter(fn ($w) => $w['chat_id'] || $w['username'])
            ->values()
            ->all();

        return Inertia::render('Notifications', [
            'agent_id' => $agent?->id ?? '',
            'agent_name' => $agent?->name ?? '',
            'webhooks' => $webhooks,
            'telegram_links' => $telegramLinks,
        ]);
    }

    public function insights(Request $request): Response
    {
        $userId = auth()->id();
        $agentIds = Agent::where('user_id', $userId)->pluck('id');

        $insights = PolicyInsight::whereIn('agent_id', $agentIds)
            ->where('status', PolicyInsight::STATUS_ACTIVE)
            ->where('confidence', '>=', 0.4)
            ->orderByDesc('confidence')
            ->get();

        return Inertia::render('Insights', [
            'insights' => $insights,
        ]);
    }

    public function claim(Request $request): Response
    {
        $code = $request->query('code', '');
        $agent = Agent::where('claim_code', strtoupper($code))->first();

        return Inertia::render('Claim', [
            'claim_code' => $code,
            'agent_name' => $agent?->name ?? 'Unknown Agent',
            'wallet_address' => $agent?->wallet_address ?? '',
            'chain_id' => $agent?->chain_id ?? 0,
            'already_claimed' => $agent?->isClaimed() ?? false,
        ]);
    }
}
