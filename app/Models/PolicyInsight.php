<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PolicyInsight extends Model
{
    use HasUuids;

    const TYPE_ADD_TO_ALLOWLIST        = 'add_to_allowlist';
    const TYPE_RAISE_THRESHOLD         = 'raise_approval_threshold';
    const TYPE_ADD_TO_CONTRACTS        = 'add_to_allowed_contracts';
    const TYPE_SCHEDULE_RESTRICTION    = 'add_schedule_restriction';
    const TYPE_MANDATE_RULE            = 'mandate_rule';

    const STATUS_ACTIVE    = 'active';
    const STATUS_ACCEPTED  = 'accepted';
    const STATUS_DISMISSED = 'dismissed';
    const STATUS_EXPIRED   = 'expired';

    protected $fillable = [
        'agent_id', 'insight_type', 'target_section', 'status',
        'confidence', 'evidence_count', 'evidence', 'suggestion',
        'title', 'description', 'policy_id',
        'accepted_at', 'dismissed_at',
    ];

    protected $casts = [
        'confidence'    => 'float',
        'evidence_count' => 'integer',
        'evidence'      => 'array',
        'suggestion'    => 'array',
        'accepted_at'   => 'datetime',
        'dismissed_at'  => 'datetime',
    ];

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }

    public function policy(): BelongsTo
    {
        return $this->belongsTo(Policy::class);
    }
}
