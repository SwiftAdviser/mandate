<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuotaReservation extends Model
{
    public $timestamps = false;

    public $incrementing = false;

    protected $primaryKey = null;

    protected $fillable = [
        'agent_id', 'window_type', 'window_key',
        'reserved_usd', 'confirmed_usd',
    ];

    protected $casts = [
        'reserved_usd' => 'decimal:6',
        'confirmed_usd' => 'decimal:6',
    ];

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }
}
