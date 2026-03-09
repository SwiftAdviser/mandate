<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Agent extends Model
{
    use HasUuids;

    protected $fillable = [
        'org_id',
        'name',
        'evm_address',
        'chain_id',
        'claim_code',
        'claimed_at',
        'circuit_breaker_active',
        'circuit_breaker_tripped_at',
        'circuit_breaker_reason',
    ];

    protected $casts = [
        'claimed_at'                 => 'datetime',
        'circuit_breaker_active'     => 'boolean',
        'circuit_breaker_tripped_at' => 'datetime',
    ];

    public function apiKeys(): HasMany
    {
        return $this->hasMany(AgentApiKey::class);
    }

    public function activeApiKey(): HasOne
    {
        return $this->hasOne(AgentApiKey::class)->whereNull('revoked_at')->latest();
    }

    public function policies(): HasMany
    {
        return $this->hasMany(Policy::class);
    }

    public function activePolicy(): HasOne
    {
        return $this->hasOne(Policy::class)->where('is_active', true)->latest();
    }

    public function intents(): HasMany
    {
        return $this->hasMany(TxIntent::class);
    }

    public function quotaReservations(): HasMany
    {
        return $this->hasMany(QuotaReservation::class);
    }

    public function isClaimed(): bool
    {
        return $this->claimed_at !== null;
    }
}
