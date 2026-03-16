<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class TxIntent extends Model
{
    use HasUuids;

    // Status constants
    const STATUS_RESERVED         = 'reserved';
    const STATUS_APPROVAL_PENDING = 'approval_pending';
    const STATUS_APPROVED         = 'approved';
    const STATUS_BROADCASTED      = 'broadcasted';
    const STATUS_CONFIRMED        = 'confirmed';
    const STATUS_FAILED           = 'failed';
    const STATUS_EXPIRED          = 'expired';

    const TERMINAL_STATUSES = [self::STATUS_CONFIRMED, self::STATUS_FAILED, self::STATUS_EXPIRED];
    const ACTIVE_STATUSES   = [self::STATUS_RESERVED, self::STATUS_APPROVAL_PENDING, self::STATUS_APPROVED, self::STATUS_BROADCASTED];

    protected $fillable = [
        'agent_id', 'policy_id', 'intent_hash',
        'chain_id', 'nonce', 'to_address', 'calldata',
        'value_wei', 'gas_limit', 'max_fee_per_gas', 'max_priority_fee_per_gas',
        'tx_type', 'access_list',
        'decoded_action', 'decoded_token', 'decoded_recipient', 'decoded_raw_amount',
        'amount_usd_computed',
        'risk_level', 'risk_assessment', 'risk_degraded',
        'status', 'block_reason', 'tx_hash', 'gas_used', 'block_number',
        'expires_at',
    ];

    protected $casts = [
        'access_list'         => 'array',
        'amount_usd_computed' => 'decimal:6',
        'risk_assessment'     => 'array',
        'risk_degraded'       => 'boolean',
        'expires_at'          => 'datetime',
        'nonce'               => 'integer',
        'chain_id'            => 'integer',
    ];

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }

    public function policy(): BelongsTo
    {
        return $this->belongsTo(Policy::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(TxEvent::class, 'intent_id');
    }

    public function approvalQueue(): HasOne
    {
        return $this->hasOne(ApprovalQueue::class, 'intent_id');
    }

    public function isTerminal(): bool
    {
        return in_array($this->status, self::TERMINAL_STATUSES, true);
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }
}
