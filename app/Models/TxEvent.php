<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TxEvent extends Model
{
    use HasUuids;

    const UPDATED_AT = null; // append-only

    protected $fillable = [
        'intent_id', 'agent_id',
        'event_type', 'actor_id', 'actor_role',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
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
