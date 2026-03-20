<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class AgentApiKey extends Model
{
    use HasUuids;

    protected $fillable = [
        'agent_id',
        'key_prefix',
        'key_hash',
        'scope',
        'is_test',
        'last_used_at',
        'revoked_at',
    ];

    protected $casts = [
        'is_test' => 'boolean',
        'last_used_at' => 'datetime',
        'revoked_at' => 'datetime',
    ];

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }

    public function isActive(): bool
    {
        return $this->revoked_at === null;
    }

    /**
     * Generate a new runtime key. Returns [rawKey, model].
     */
    public static function generate(Agent $agent): array
    {
        $testChains = ['84532', '11155111'];
        $isTest = in_array((string) $agent->chain_id, $testChains, true);
        $prefix = $isTest ? 'mndt_test_' : 'mndt_live_';
        $random = Str::random(32);
        $rawKey = $prefix.$random;
        $keyHash = hash('sha256', $rawKey);
        $keyPrefix = $prefix.substr($random, 0, 6);

        $model = self::create([
            'agent_id' => $agent->id,
            'key_prefix' => $keyPrefix,
            'key_hash' => $keyHash,
            'scope' => 'runtime',
            'is_test' => $isTest,
        ]);

        return [$rawKey, $model];
    }
}
