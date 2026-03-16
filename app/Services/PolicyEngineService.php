<?php

namespace App\Services;

use App\Jobs\SendApprovalNotification;
use App\Models\Agent;
use App\Models\ApprovalQueue;
use App\Models\Policy;
use App\Models\TxIntent;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use kornrunner\Keccak;

class PolicyEngineService
{
    public function __construct(
        private CalldataDecoderService $decoder,
        private PriceOracleService $priceOracle,
        private CircuitBreakerService $circuitBreaker,
        private QuotaManagerService $quota,
        private IntentStateMachineService $stateMachine,
        private AegisService $aegisService,
        private ReputationService $reputationService,
    ) {}

    /**
     * Validate an intent against policy. Returns result array.
     *
     * Result: {
     *   allowed: bool,
     *   intentId: string|null,
     *   requiresApproval: bool,
     *   approvalId: string|null,
     *   blockReason: string|null,
     * }
     */
    public function validate(Agent $agent, array $payload): array
    {
        // ----- Phase 1: reads only -----

        // 1. Circuit breaker (from middleware — but double-check here)
        if ($this->circuitBreaker->isActive($agent->id)) {
            return $this->block('circuit_breaker_active', 'Agent circuit breaker is tripped. Reset via dashboard or POST /api/agents/{id}/circuit-break');
        }

        // 2. Active policy
        $policy = $agent->activePolicy()->first();
        if (! $policy) {
            return $this->block('no_active_policy', 'No policy found for this agent. Create one via dashboard or POST /api/agents/{agentId}/policies');
        }

        // 3. Recompute intentHash server-side
        $serverHash = $this->computeIntentHash($payload);
        if ($serverHash !== strtolower($payload['intentHash'])) {
            return $this->block('intent_hash_mismatch', "Computed {$serverHash} != submitted ".strtolower($payload['intentHash']).'. Ensure @mandate/sdk is latest version');
        }

        // 4. Decode calldata
        $decoded = $this->decoder->decode($payload['calldata'] ?? '0x', $payload['to']);
        $action = $decoded['action'] ?? 'unknown';

        // 5. Compute USD amount (approve is exempt)
        $amountUsd = null;
        if ($this->decoder->isSpendBearing($action) && ! empty($decoded['token'])) {
            $amountUsd = $this->priceOracle->toUsd(
                $payload['chainId'],
                $decoded['token'],
                $decoded['raw_amount'] ?? '0'
            );
        }

        // 6. Gas limit check
        if ($policy->max_gas_limit && hexdec($payload['gasLimit']) > hexdec($policy->max_gas_limit)) {
            $policyGas = $policy->max_gas_limit;

            return $this->block('gas_limit_exceeded', "Gas {$payload['gasLimit']} exceeds policy limit {$policyGas}");
        }

        // 7. Max native value check
        if ($policy->max_value_wei) {
            $valueWei = $payload['valueWei'] ?? '0';
            if (bccomp($valueWei, $policy->max_value_wei) > 0) {
                return $this->block('value_wei_exceeded', "Value {$valueWei} exceeds max {$policy->max_value_wei} wei");
            }
        }

        // 8. Schedule check
        if ($policy->schedule && ! $this->checkSchedule($policy->schedule)) {
            $now = now();
            $day = strtolower($now->format('l'));
            $hour = (int) $now->format('G');
            $days = implode(', ', $policy->schedule['days'] ?? []);
            $hours = implode(', ', array_map('strval', $policy->schedule['hours'] ?? []));

            return $this->block('outside_schedule', "{$hour}:00 {$day} outside allowed schedule: days=[{$days}] hours=[{$hours}]");
        }

        // 9. Allowed addresses check
        if ($policy->allowed_addresses && ! empty($policy->allowed_addresses)) {
            $to = strtolower($payload['to']);
            if (! in_array($to, array_map('strtolower', $policy->allowed_addresses), true)) {
                $list = implode(', ', array_slice(array_map('strtolower', $policy->allowed_addresses), 0, 5));

                return $this->block('address_not_allowed', "{$to} not in allowlist [{$list}]. Add via policy API");
            }
        }

        // 10. Blocked selectors
        if ($policy->blocked_selectors && ! empty($payload['calldata'])) {
            $selector = strtolower(substr($payload['calldata'], 0, 10));
            if (in_array($selector, array_map('strtolower', $policy->blocked_selectors), true)) {
                return $this->block('selector_blocked', "Selector {$selector} is blocked by policy");
            }
        }

        // 11. Per-tx spend limit (spend-bearing only)
        if ($this->decoder->isSpendBearing($action) && $amountUsd !== null && $policy->spend_limit_per_tx_usd) {
            if ($amountUsd > (float) $policy->spend_limit_per_tx_usd) {
                $limit = $policy->spend_limit_per_tx_usd;

                return $this->block('per_tx_limit_exceeded', '$'.number_format($amountUsd, 2)." exceeds \${$limit}/tx limit. Adjust via dashboard or POST /api/agents/{agentId}/policies");
            }
        }

        // 12. Approval required?
        $needsApproval = $this->needsApproval($policy, $action, $amountUsd, $payload['calldata'] ?? '0x');

        // Phase 1.5a: Agent Reputation (EIP-8004)
        $reputationResult = null;
        if (config('mandate.reputation.enabled')) {
            $reputationResult = $this->reputationService->check(
                $agent->evm_address, $payload['chainId']
            );

            if (! $reputationResult['degraded']) {
                if (! $reputationResult['registered']) {
                    if (config('mandate.reputation.thresholds.unknown_requires_approval', true)) {
                        $needsApproval = true;
                    }
                } elseif ($reputationResult['score'] !== null
                          && $reputationResult['score'] < config('mandate.reputation.thresholds.low_score', 30)) {
                    $needsApproval = true;
                }
            }
        }

        // Phase 1.5b: Risk Intelligence (W3A via AegisService)
        $riskAssessment = null;
        if ($policy->risk_scan_enabled && config('mandate.aegis.enabled')) {
            $riskAssessment = $this->aegisService->assess($payload, $decoded);

            if ($riskAssessment['risk_level'] === 'CRITICAL') {
                return $this->block('aegis_critical_risk', 'Transaction flagged as CRITICAL risk by security scanner. Contact agent owner');
            }
            if ($riskAssessment['risk_level'] === 'HIGH') {
                $needsApproval = true;
            }
        }

        // ----- Phase 2: DB transaction -----

        $result = null;

        DB::transaction(function () use (
            $agent, $policy, $payload, $serverHash,
            $decoded, $action, $amountUsd, $needsApproval, $riskAssessment, $reputationResult, &$result
        ) {
            // 13. INSERT intent — ON CONFLICT DO NOTHING
            $intentId = Str::uuid()->toString();
            $inserted = DB::table('tx_intents')->insertOrIgnore([
                'id' => $intentId,
                'agent_id' => $agent->id,
                'policy_id' => $policy->id,
                'intent_hash' => $serverHash,
                'chain_id' => $payload['chainId'],
                'nonce' => $payload['nonce'],
                'to_address' => strtolower($payload['to']),
                'calldata' => $payload['calldata'] ?? '0x',
                'value_wei' => $payload['valueWei'] ?? '0',
                'gas_limit' => $payload['gasLimit'],
                'max_fee_per_gas' => $payload['maxFeePerGas'],
                'max_priority_fee_per_gas' => $payload['maxPriorityFeePerGas'],
                'tx_type' => $payload['txType'] ?? 2,
                'access_list' => json_encode($payload['accessList'] ?? []),
                'decoded_action' => $action,
                'decoded_token' => $decoded['token'] ?? null,
                'decoded_recipient' => $decoded['recipient'] ?? null,
                'decoded_raw_amount' => $decoded['raw_amount'] ?? null,
                'amount_usd_computed' => $amountUsd,
                'risk_level' => $riskAssessment['risk_level'] ?? null,
                'risk_assessment' => ($riskAssessment || $reputationResult) ? json_encode(array_filter([
                    'aegis' => $riskAssessment,
                    'reputation' => $reputationResult,
                ])) : null,
                'risk_degraded' => $riskAssessment['degraded'] ?? false,
                'status' => TxIntent::STATUS_RESERVED,
                'expires_at' => now()->addSeconds(config('mandate.intent_ttl.reserved', 900)),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Duplicate intent — return existing
            if (! $inserted) {
                $existing = TxIntent::where('agent_id', $agent->id)
                    ->where('intent_hash', $serverHash)
                    ->first();
                $result = [
                    'allowed' => ! $existing->isTerminal(),
                    'intentId' => $existing->id,
                    'requiresApproval' => $existing->status === TxIntent::STATUS_APPROVAL_PENDING,
                    'approvalId' => $existing->approvalQueue?->id,
                    'blockReason' => null,
                ];

                return;
            }

            // 14. Quota check (spend-bearing only)
            if ($this->decoder->isSpendBearing($action) && $amountUsd !== null && $amountUsd > 0) {
                $quotaCheck = $this->quota->check($agent->id, $policy, $amountUsd);

                if (! $quotaCheck['daily_ok']) {
                    DB::table('tx_intents')->where('id', $intentId)->delete();
                    $result = $this->block('daily_quota_exceeded', "Daily spend would exceed \${$policy->spend_limit_per_day_usd}/day limit. Resets at midnight UTC");

                    return;
                }

                if (! $quotaCheck['monthly_ok']) {
                    DB::table('tx_intents')->where('id', $intentId)->delete();
                    $result = $this->block('monthly_quota_exceeded', 'Monthly spend would exceed limit. Resets on 1st of month UTC');

                    return;
                }

                // 15. Reserve quota
                $this->quota->reserve($agent->id, $amountUsd);
            }

            // 16. Approval queue if needed
            $approvalId = null;
            if ($needsApproval) {
                $approvalExpiry = now()->addSeconds(config('mandate.intent_ttl.approval_pending', 3600));
                $approvalId = Str::uuid()->toString();

                DB::table('approval_queues')->insert([
                    'id' => $approvalId,
                    'intent_id' => $intentId,
                    'agent_id' => $agent->id,
                    'status' => ApprovalQueue::STATUS_PENDING,
                    'expires_at' => $approvalExpiry,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                DB::table('tx_intents')->where('id', $intentId)->update([
                    'status' => TxIntent::STATUS_APPROVAL_PENDING,
                    'expires_at' => $approvalExpiry,
                    'updated_at' => now(),
                ]);
            }

            // 17. Audit event
            DB::table('tx_events')->insert([
                'id' => Str::uuid(),
                'intent_id' => $intentId,
                'agent_id' => $agent->id,
                'event_type' => 'validated',
                'actor_id' => $agent->id,
                'actor_role' => 'agent',
                'metadata' => json_encode([
                    'action' => $action,
                    'amount_usd' => $amountUsd,
                    'needs_approval' => $needsApproval,
                    'risk_level' => $riskAssessment['risk_level'] ?? null,
                    'reputation_score' => $reputationResult['score'] ?? null,
                    'reputation_registered' => $reputationResult['registered'] ?? null,
                ]),
                'created_at' => now(),
            ]);

            $result = [
                'allowed' => true,
                'intentId' => $intentId,
                'requiresApproval' => $needsApproval,
                'approvalId' => $approvalId,
                'blockReason' => null,
                'riskLevel' => $riskAssessment['risk_level'] ?? null,
                'riskDegraded' => $riskAssessment['degraded'] ?? false,
            ];
        });

        // Dispatch notification job after DB commit (best-effort)
        if ($result && ($result['requiresApproval'] ?? false) && $result['approvalId']) {
            SendApprovalNotification::dispatch(
                $result['approvalId'],
                $result['intentId'],
                $agent->id,
            );
        }

        return $result ?? $this->block('transaction_failed');
    }

    private function computeIntentHash(array $payload): string
    {
        // Recompute keccak256 of canonical fields
        // keccak256(chainId || nonce || to || calldata || valueWei || gasLimit || maxFeePerGas || maxPriorityFeePerGas || txType || accessList)
        $packed = implode('|', [
            $payload['chainId'],
            $payload['nonce'],
            strtolower($payload['to']),
            strtolower($payload['calldata'] ?? '0x'),
            $payload['valueWei'] ?? '0',
            $payload['gasLimit'],
            $payload['maxFeePerGas'],
            $payload['maxPriorityFeePerGas'],
            $payload['txType'] ?? 2,
            json_encode($payload['accessList'] ?? []),
        ]);

        return '0x'.Keccak::hash($packed, 256);
    }

    private function needsApproval(Policy $policy, string $action, ?float $amountUsd, string $calldata): bool
    {
        if ($policy->require_approval_selectors && ! empty($calldata)) {
            $selector = strtolower(substr($calldata, 0, 10));
            if (in_array($selector, array_map('strtolower', $policy->require_approval_selectors), true)) {
                return true;
            }
        }

        if ($policy->require_approval_above_usd && $amountUsd !== null) {
            if ($amountUsd > (float) $policy->require_approval_above_usd) {
                return true;
            }
        }

        return false;
    }

    private function checkSchedule(array $schedule): bool
    {
        $now = now();
        $day = strtolower($now->format('l')); // 'monday', 'tuesday', etc.
        $hour = (int) $now->format('G');

        $allowedDays = array_map('strtolower', $schedule['days'] ?? []);
        $allowedHours = $schedule['hours'] ?? [];

        if (! empty($allowedDays) && ! in_array($day, $allowedDays, true)) {
            return false;
        }
        if (! empty($allowedHours) && ! in_array($hour, $allowedHours, true)) {
            return false;
        }

        return true;
    }

    private function block(string $reason, string $detail = ''): array
    {
        return [
            'allowed' => false,
            'intentId' => null,
            'requiresApproval' => false,
            'approvalId' => null,
            'blockReason' => $reason,
            'blockDetail' => $detail,
        ];
    }
}
