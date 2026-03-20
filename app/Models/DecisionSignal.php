<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DecisionSignal extends Model
{
    use HasUuids;

    const UPDATED_AT = null;

    protected $fillable = [
        'agent_id', 'intent_id', 'signal_type',
        'to_address', 'decoded_action', 'amount_usd',
        'chain_id', 'reason', 'block_reason',
        'day_of_week', 'hour_of_day', 'decision_note',
    ];

    protected $casts = [
        'amount_usd' => 'decimal:6',
        'chain_id'   => 'integer',
        'hour_of_day' => 'integer',
    ];

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }

    public function intent(): BelongsTo
    {
        return $this->belongsTo(TxIntent::class, 'intent_id');
    }
}
