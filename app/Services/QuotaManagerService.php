<?php

namespace App\Services;

use App\Models\Policy;
use App\Models\TxIntent;
use Illuminate\Support\Facades\DB;

class QuotaManagerService
{
    /**
     * Check if quota is available. Returns ['daily_ok', 'monthly_ok'].
     * Does NOT reserve — call reserve() separately inside a transaction.
     */
    public function check(string $agentId, Policy $policy, float $amountUsd): array
    {
        $dailyKey = now()->format('Y-m-d');
        $monthlyKey = now()->format('Y-m');

        $rows = DB::table('quota_reservations')
            ->where('agent_id', $agentId)
            ->whereIn('window_key', [$dailyKey, $monthlyKey])
            ->get()
            ->keyBy('window_key');

        $dailyRow = $rows->get($dailyKey);
        $monthlyRow = $rows->get($monthlyKey);

        $dailyUsed = $dailyRow ? (float) $dailyRow->reserved_usd + (float) $dailyRow->confirmed_usd : 0.0;
        $monthlyUsed = $monthlyRow ? (float) $monthlyRow->reserved_usd + (float) $monthlyRow->confirmed_usd : 0.0;

        $dailyOk = $policy->spend_limit_per_day_usd === null
            || ($dailyUsed + $amountUsd) <= (float) $policy->spend_limit_per_day_usd;

        $monthlyOk = $policy->spend_limit_per_month_usd === null
            || ($monthlyUsed + $amountUsd) <= (float) $policy->spend_limit_per_month_usd;

        return [
            'daily_ok' => $dailyOk,
            'monthly_ok' => $monthlyOk,
            'daily_used' => $dailyUsed,
            'monthly_used' => $monthlyUsed,
        ];
    }

    /**
     * UPSERT quota reservation for both daily + monthly windows.
     * Must be called inside a DB::transaction().
     */
    public function reserve(string $agentId, float $amountUsd): void
    {
        $dailyKey = now()->format('Y-m-d');
        $monthlyKey = now()->format('Y-m');

        foreach ([['daily', $dailyKey], ['monthly', $monthlyKey]] as [$type, $key]) {
            // Use manual insert-or-update for cross-DB compat (SQLite, PG)
            $existing = DB::table('quota_reservations')
                ->where('agent_id', $agentId)
                ->where('window_type', $type)
                ->where('window_key', $key)
                ->first();

            if ($existing) {
                DB::table('quota_reservations')
                    ->where('agent_id', $agentId)
                    ->where('window_type', $type)
                    ->where('window_key', $key)
                    ->update(['reserved_usd' => DB::raw("reserved_usd + {$amountUsd}")]);
            } else {
                DB::table('quota_reservations')->insertOrIgnore([
                    'agent_id' => $agentId,
                    'window_type' => $type,
                    'window_key' => $key,
                    'reserved_usd' => $amountUsd,
                    'confirmed_usd' => 0,
                    'updated_at' => now(),
                ]);
            }
        }
    }

    /**
     * Release quota — subtract reserved amount.
     * Called when intent fails/expires.
     */
    public function release(string $agentId, float $amountUsd): void
    {
        if ($amountUsd <= 0) {
            return;
        }

        $dailyKey = now()->format('Y-m-d');
        $monthlyKey = now()->format('Y-m');

        // MAX(0, x) works in both SQLite and PostgreSQL; GREATEST() is PG-only
        $clamp = "CASE WHEN reserved_usd > {$amountUsd} THEN reserved_usd - {$amountUsd} ELSE 0 END";

        foreach ([['daily', $dailyKey], ['monthly', $monthlyKey]] as [$type, $key]) {
            DB::table('quota_reservations')
                ->where('agent_id', $agentId)
                ->where('window_type', $type)
                ->where('window_key', $key)
                ->update(['reserved_usd' => DB::raw($clamp)]);
        }
    }

    /**
     * Confirm quota — move reserved → confirmed.
     */
    public function confirm(string $agentId, TxIntent $intent): void
    {
        $amountUsd = (float) ($intent->amount_usd_computed ?? 0);
        if ($amountUsd <= 0) {
            return;
        }

        $dailyKey = $intent->created_at->format('Y-m-d');
        $monthlyKey = $intent->created_at->format('Y-m');

        $clamp = "CASE WHEN reserved_usd > {$amountUsd} THEN reserved_usd - {$amountUsd} ELSE 0 END";

        foreach ([['daily', $dailyKey], ['monthly', $monthlyKey]] as [$type, $key]) {
            DB::table('quota_reservations')
                ->where('agent_id', $agentId)
                ->where('window_type', $type)
                ->where('window_key', $key)
                ->update([
                    'reserved_usd' => DB::raw($clamp),
                    'confirmed_usd' => DB::raw("confirmed_usd + {$amountUsd}"),
                ]);
        }
    }
}
