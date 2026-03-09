<?php

namespace App\Services;

use App\Models\ApprovalQueue;
use App\Models\TxIntent;
use Illuminate\Support\Facades\DB;

class IntentStateMachineService
{
    private QuotaManagerService $quota;

    public function __construct(QuotaManagerService $quota)
    {
        $this->quota = $quota;
    }

    /**
     * Transition intent to a new status.
     * Handles quota release/confirm and appends audit event.
     */
    public function transition(
        TxIntent $intent,
        string   $newStatus,
        string   $actorId,
        string   $actorRole,
        array    $metadata = []
    ): TxIntent {
        DB::transaction(function () use ($intent, $newStatus, $actorId, $actorRole, $metadata) {
            $updates = ['status' => $newStatus];

            $updates['expires_at'] = match ($newStatus) {
                TxIntent::STATUS_RESERVED         => now()->addSeconds(config('mandate.intent_ttl.reserved', 900)),
                TxIntent::STATUS_APPROVED         => now()->addSeconds(config('mandate.intent_ttl.approved', 600)),
                TxIntent::STATUS_BROADCASTED,
                TxIntent::STATUS_CONFIRMED,
                TxIntent::STATUS_FAILED,
                TxIntent::STATUS_EXPIRED          => null,
                TxIntent::STATUS_APPROVAL_PENDING => $intent->expires_at, // set by ApprovalQueue
                default                           => $intent->expires_at,
            };

            if ($newStatus === TxIntent::STATUS_FAILED) {
                $updates['block_reason'] = $metadata['block_reason'] ?? $intent->block_reason;
            }

            $intent->update($updates);

            // Quota management
            $isTerminal = in_array($newStatus, [
                TxIntent::STATUS_FAILED,
                TxIntent::STATUS_EXPIRED,
            ], true);

            if ($isTerminal && $intent->amount_usd_computed > 0) {
                $this->quota->release($intent->agent_id, (float) $intent->amount_usd_computed);
            }

            if ($newStatus === TxIntent::STATUS_CONFIRMED && $intent->amount_usd_computed > 0) {
                $this->quota->confirm($intent->agent_id, $intent);
            }

            // Append audit event
            DB::table('tx_events')->insert([
                'id'         => \Illuminate\Support\Str::uuid(),
                'intent_id'  => $intent->id,
                'agent_id'   => $intent->agent_id,
                'event_type' => $newStatus,
                'actor_id'   => $actorId,
                'actor_role' => $actorRole,
                'metadata'   => json_encode($metadata),
                'created_at' => now(),
            ]);
        });

        $intent->refresh();
        return $intent;
    }

    /**
     * Expire all intents that have passed their TTL.
     */
    public function expireStale(): int
    {
        $expired = 0;

        $stale = TxIntent::whereIn('status', [
            TxIntent::STATUS_RESERVED,
            TxIntent::STATUS_APPROVED,
            TxIntent::STATUS_APPROVAL_PENDING,
        ])
            ->where('expires_at', '<', now())
            ->get();

        foreach ($stale as $intent) {
            $this->transition($intent, TxIntent::STATUS_EXPIRED, 'system', 'system', [
                'reason' => 'TTL expired',
            ]);
            $expired++;
        }

        return $expired;
    }
}
