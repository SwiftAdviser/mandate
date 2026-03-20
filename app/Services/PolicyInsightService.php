<?php

namespace App\Services;

use App\Models\Agent;
use App\Models\DecisionSignal;
use App\Models\Policy;
use App\Models\PolicyInsight;
use App\Models\TxIntent;
use Illuminate\Support\Collection;

class PolicyInsightService
{
    // ── Public API ───────────────────────────────────────────────────────────

    public function recordSignal(TxIntent $intent, string $signalType, ?string $decisionNote = null): DecisionSignal
    {
        return DecisionSignal::create([
            'agent_id' => $intent->agent_id,
            'intent_id' => $intent->id,
            'signal_type' => $signalType,
            'to_address' => $intent->to_address ? strtolower($intent->to_address) : null,
            'decoded_action' => $intent->decoded_action,
            'amount_usd' => $intent->amount_usd_computed,
            'chain_id' => $intent->chain_id,
            'reason' => $intent->reason,
            'block_reason' => $intent->block_reason,
            'day_of_week' => now()->format('l'),
            'hour_of_day' => now()->hour,
            'decision_note' => $decisionNote,
        ]);
    }

    public function analyzeAgent(string $agentId): Collection
    {
        $agent = Agent::with('activePolicy')->find($agentId);
        if (! $agent) {
            return collect();
        }

        $policy = $agent->activePolicy;
        $signals = DecisionSignal::where('agent_id', $agentId)->get();

        if ($signals->isEmpty()) {
            return collect();
        }

        $newInsights = collect();

        $newInsights = $newInsights->merge($this->detectAllowlistCandidates($agentId, $signals, $policy));
        $newInsights = $newInsights->merge($this->detectThresholdRaise($agentId, $signals, $policy));
        $newInsights = $newInsights->merge($this->detectContractAllowlist($agentId, $signals, $policy));
        $newInsights = $newInsights->merge($this->detectScheduleRestriction($agentId, $signals));

        return $newInsights;
    }

    public function applyInsight(PolicyInsight $insight): void
    {
        $agent = Agent::find($insight->agent_id);
        $policy = $agent->activePolicy()->first();

        if (! $policy) {
            return;
        }

        $newPolicyData = $this->buildNewPolicyData($insight, $policy);

        // Deactivate current
        $agent->policies()->where('is_active', true)->update(['is_active' => false]);

        $newPolicy = Policy::create(array_merge($newPolicyData, [
            'agent_id' => $agent->id,
            'is_active' => true,
            'version' => ($agent->policies()->max('version') ?? 0) + 1,
        ]));

        $insight->update([
            'status' => PolicyInsight::STATUS_ACCEPTED,
            'accepted_at' => now(),
            'policy_id' => $newPolicy->id,
        ]);
    }

    public function dismissInsight(PolicyInsight $insight): void
    {
        $insight->update([
            'status' => PolicyInsight::STATUS_DISMISSED,
            'dismissed_at' => now(),
        ]);
    }

    public function getActiveInsights(string $agentId): Collection
    {
        return PolicyInsight::where('agent_id', $agentId)
            ->where('status', PolicyInsight::STATUS_ACTIVE)
            ->where('confidence', '>=', config('mandate.insights.min_confidence'))
            ->orderByDesc('confidence')
            ->get();
    }

    // ── Detectors ───────────────────────────────────────────────────────────

    private function detectAllowlistCandidates(string $agentId, Collection $signals, ?Policy $policy): Collection
    {
        $allowedAddresses = collect($policy?->allowed_addresses ?? [])->map(fn ($a) => strtolower($a));

        $approved = $signals->where('signal_type', 'approved')->whereNotNull('to_address');
        $rejected = $signals->where('signal_type', 'rejected')->whereNotNull('to_address');

        $rejectedAddresses = $rejected->pluck('to_address')->unique();

        $candidates = $approved->groupBy('to_address');
        $insights = collect();

        foreach ($candidates as $address => $group) {
            if ($allowedAddresses->contains(strtolower($address))) {
                continue;
            }
            if ($rejectedAddresses->contains($address)) {
                continue;
            }

            $count = $group->count();
            $confidence = $this->computeConfidence($count);
            $shortAddr = substr($address, 0, 6).'...'.substr($address, -4);

            $insight = $this->upsertInsight($agentId, PolicyInsight::TYPE_ADD_TO_ALLOWLIST, $address, [
                'confidence' => $confidence,
                'evidence_count' => $count,
                'evidence' => $this->buildEvidence($group),
                'suggestion' => ['field' => 'allowed_addresses', 'action' => 'add', 'value' => $address],
                'title' => "Add {$shortAddr} to allowlist",
                'description' => "You approved {$count} transfer(s) to this address with no rejections.",
            ]);

            if ($insight) {
                $insights->push($insight);
            }
        }

        return $insights;
    }

    private function detectThresholdRaise(string $agentId, Collection $signals, ?Policy $policy): Collection
    {
        $threshold = $policy?->require_approval_above_usd;
        if ($threshold === null) {
            return collect();
        }

        $threshold = (float) $threshold;
        $aboveThreshold = $signals->where('signal_type', 'approved')
            ->filter(fn ($s) => $s->amount_usd !== null && (float) $s->amount_usd > $threshold);

        if ($aboveThreshold->isEmpty()) {
            return collect();
        }

        $count = $aboveThreshold->count();
        $maxAmount = $aboveThreshold->max(fn ($s) => (float) $s->amount_usd);
        $confidence = $this->computeConfidence($count);

        $insight = $this->upsertInsight($agentId, PolicyInsight::TYPE_RAISE_THRESHOLD, 'threshold', [
            'confidence' => $confidence,
            'evidence_count' => $count,
            'evidence' => $this->buildEvidence($aboveThreshold),
            'suggestion' => ['field' => 'require_approval_above_usd', 'action' => 'set', 'value' => $maxAmount],
            'title' => "Raise approval threshold to \${$maxAmount}",
            'description' => "You approved {$count} transaction(s) above the current \${$threshold} threshold.",
        ]);

        return $insight ? collect([$insight]) : collect();
    }

    private function detectContractAllowlist(string $agentId, Collection $signals, ?Policy $policy): Collection
    {
        $allowedContracts = collect($policy?->allowed_contracts ?? [])->map(fn ($a) => strtolower($a));
        $skipActions = ['erc20_transfer', 'native_transfer', null];

        $contractApprovals = $signals->where('signal_type', 'approved')
            ->whereNotNull('to_address')
            ->filter(fn ($s) => ! in_array($s->decoded_action, $skipActions, true));

        $rejected = $signals->where('signal_type', 'rejected')
            ->whereNotNull('to_address')
            ->pluck('to_address')->unique();

        $candidates = $contractApprovals->groupBy('to_address');
        $insights = collect();

        foreach ($candidates as $address => $group) {
            if ($allowedContracts->contains(strtolower($address))) {
                continue;
            }
            if ($rejected->contains($address)) {
                continue;
            }

            $count = $group->count();
            $confidence = $this->computeConfidence($count);
            $action = $group->first()->decoded_action ?? 'interaction';
            $shortAddr = substr($address, 0, 6).'...'.substr($address, -4);

            $insight = $this->upsertInsight($agentId, PolicyInsight::TYPE_ADD_TO_CONTRACTS, $address, [
                'confidence' => $confidence,
                'evidence_count' => $count,
                'evidence' => $this->buildEvidence($group),
                'suggestion' => ['field' => 'allowed_contracts', 'action' => 'add', 'value' => $address],
                'title' => "Add {$shortAddr} ({$action}) to allowed contracts",
                'description' => "You approved {$count} {$action} transaction(s) to this contract.",
            ]);

            if ($insight) {
                $insights->push($insight);
            }
        }

        return $insights;
    }

    private function detectScheduleRestriction(string $agentId, Collection $signals): Collection
    {
        $rejections = $signals->where('signal_type', 'rejected');

        if ($rejections->isEmpty()) {
            return collect();
        }

        // Group by day_of_week
        $byDay = $rejections->whereNotNull('day_of_week')->groupBy('day_of_week');
        $insights = collect();

        foreach ($byDay as $day => $group) {
            $count = $group->count();
            if ($count < 1) {
                continue;
            }

            $confidence = $this->computeConfidence($count);
            $insight = $this->upsertInsight($agentId, PolicyInsight::TYPE_SCHEDULE_RESTRICTION, "day:{$day}", [
                'confidence' => $confidence,
                'evidence_count' => $count,
                'evidence' => $this->buildEvidence($group),
                'suggestion' => ['field' => 'schedule', 'action' => 'restrict_day', 'value' => $day],
                'title' => "Add schedule restriction for {$day}",
                'description' => "You rejected {$count} transaction(s) on {$day}.",
            ]);

            if ($insight) {
                $insights->push($insight);
            }
        }

        return $insights;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function computeConfidence(int $count): float
    {
        return min(1.0, 0.4 + ($count - 1) * 0.15);
    }

    private function buildEvidence(Collection $signals): array
    {
        return $signals->take(10)->map(fn ($s) => [
            'intent_id' => $s->intent_id,
            'decision' => $s->signal_type,
            'amount_usd' => $s->amount_usd,
            'to_address' => $s->to_address,
            'decoded_action' => $s->decoded_action,
            'reason' => $s->reason,
            'decision_note' => $s->decision_note,
            'created_at' => $s->created_at?->toIso8601String(),
        ])->values()->toArray();
    }

    /**
     * Upsert: update existing active insight or create new one.
     * Returns the insight if newly created, null if only updated or dismissed exists.
     */
    private function upsertInsight(string $agentId, string $type, string $key, array $data): ?PolicyInsight
    {
        // Check for dismissed insight with same key (don't resurrect)
        $dismissed = PolicyInsight::where('agent_id', $agentId)
            ->where('insight_type', $type)
            ->where('status', PolicyInsight::STATUS_DISMISSED)
            ->where('title', 'LIKE', '%'.substr($key, 0, 10).'%')
            ->exists();

        // More precise check: match by suggestion value
        $existingDismissed = PolicyInsight::where('agent_id', $agentId)
            ->where('insight_type', $type)
            ->where('status', PolicyInsight::STATUS_DISMISSED)
            ->get()
            ->first(function ($i) use ($data) {
                $suggestionValue = $data['suggestion']['value'] ?? $data['suggestion']['rule_text'] ?? null;
                $existingValue = $i->suggestion['value'] ?? $i->suggestion['rule_text'] ?? null;

                return $suggestionValue && $existingValue && $suggestionValue === $existingValue;
            });

        if ($existingDismissed) {
            return null;
        }

        // Find existing active insight for same type+value
        $existing = PolicyInsight::where('agent_id', $agentId)
            ->where('insight_type', $type)
            ->where('status', PolicyInsight::STATUS_ACTIVE)
            ->get()
            ->first(function ($i) use ($data) {
                $suggestionValue = $data['suggestion']['value'] ?? $data['suggestion']['rule_text'] ?? null;
                $existingValue = $i->suggestion['value'] ?? $i->suggestion['rule_text'] ?? null;

                return $suggestionValue && $existingValue && $suggestionValue === $existingValue;
            });

        if ($existing) {
            $existing->update([
                'confidence' => $data['confidence'],
                'evidence_count' => $data['evidence_count'],
                'evidence' => $data['evidence'],
                'title' => $data['title'],
                'description' => $data['description'],
            ]);

            return null; // Not newly created
        }

        $isNew = true;
        $insight = PolicyInsight::create(array_merge($data, [
            'agent_id' => $agentId,
            'insight_type' => $type,
            'status' => PolicyInsight::STATUS_ACTIVE,
        ]));

        return $insight;
    }

    private function buildNewPolicyData(PolicyInsight $insight, Policy $currentPolicy): array
    {
        $base = [
            'spend_limit_per_tx_usd' => $currentPolicy->spend_limit_per_tx_usd,
            'spend_limit_per_day_usd' => $currentPolicy->spend_limit_per_day_usd,
            'spend_limit_per_month_usd' => $currentPolicy->spend_limit_per_month_usd,
            'allowed_addresses' => $currentPolicy->allowed_addresses,
            'allowed_contracts' => $currentPolicy->allowed_contracts,
            'blocked_selectors' => $currentPolicy->blocked_selectors,
            'require_approval_selectors' => $currentPolicy->require_approval_selectors,
            'require_approval_above_usd' => $currentPolicy->require_approval_above_usd,
            'max_slippage_bps' => $currentPolicy->max_slippage_bps,
            'max_gas_limit' => $currentPolicy->max_gas_limit,
            'max_value_wei' => $currentPolicy->max_value_wei,
            'schedule' => $currentPolicy->schedule,
            'guard_rules' => $currentPolicy->guard_rules,
        ];

        $suggestion = $insight->suggestion;

        switch ($insight->insight_type) {
            case PolicyInsight::TYPE_ADD_TO_ALLOWLIST:
                $addresses = $base['allowed_addresses'] ?? [];
                $addresses[] = $suggestion['value'];
                $base['allowed_addresses'] = array_values(array_unique($addresses));
                break;

            case PolicyInsight::TYPE_ADD_TO_CONTRACTS:
                $contracts = $base['allowed_contracts'] ?? [];
                $contracts[] = $suggestion['value'];
                $base['allowed_contracts'] = array_values(array_unique($contracts));
                break;

            case PolicyInsight::TYPE_RAISE_THRESHOLD:
                $base['require_approval_above_usd'] = $suggestion['value'];
                break;

            case PolicyInsight::TYPE_MANDATE_RULE:
                $base['guard_rules'] = $this->appendGuardRule(
                    $base['guard_rules'] ?? '',
                    $suggestion['section'] ?? 'block',
                    $suggestion['rule_text'] ?? '',
                );
                break;
        }

        return $base;
    }

    private function appendGuardRule(string $guardRules, string $section, string $ruleText): string
    {
        $sectionHeaders = [
            'block' => '## Block immediately',
            'require_approval' => '## Require human approval',
            'allow' => '## Allow',
        ];

        $header = $sectionHeaders[$section] ?? $sectionHeaders['block'];

        // Find the section and append
        $pos = strpos($guardRules, $header);

        if ($pos !== false) {
            // Find the end of the section (next ## or end of string)
            $nextSection = strpos($guardRules, "\n##", $pos + strlen($header));
            $insertPos = $nextSection !== false ? $nextSection : strlen($guardRules);

            // Ensure newline before rule
            $prefix = str_ends_with(rtrim(substr($guardRules, 0, $insertPos)), "\n") ? '' : "\n";

            return substr($guardRules, 0, $insertPos).$prefix.$ruleText."\n".substr($guardRules, $insertPos);
        }

        // Section doesn't exist: append it
        $separator = $guardRules ? "\n\n" : '';

        return $guardRules.$separator.$header."\n".$ruleText."\n";
    }
}
