<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApprovalQueue extends Model
{
    use HasUuids;

    const STATUS_PENDING  = 'pending';
    const STATUS_APPROVED = 'approved';
    const STATUS_REJECTED = 'rejected';
    const STATUS_EXPIRED  = 'expired';

    protected $fillable = [
        'intent_id', 'agent_id',
        'status', 'decided_by_user_id', 'decision_note',
        'decided_at', 'expires_at',
    ];

    protected $casts = [
        'decided_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    public function intent(): BelongsTo
    {
        return $this->belongsTo(TxIntent::class, 'intent_id');
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }
}
