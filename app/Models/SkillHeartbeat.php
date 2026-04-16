<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SkillHeartbeat extends Model
{
    const UPDATED_AT = null;

    protected $fillable = [
        'agent_id',
        'ip',
        'user_agent',
        'skill_version',
    ];

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }
}
