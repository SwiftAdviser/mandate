<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Policy extends Model
{
    use HasUuids;

    protected $fillable = [
        'agent_id',
        'spend_limit_per_tx_usd',
        'spend_limit_per_day_usd',
        'spend_limit_per_month_usd',
        'allowed_addresses',
        'allowed_contracts',
        'blocked_selectors',
        'require_approval_selectors',
        'require_approval_above_usd',
        'max_slippage_bps',
        'max_gas_limit',
        'max_value_wei',
        'schedule',
        'is_active',
        'risk_scan_enabled',
        'version',
    ];

    protected $casts = [
        'spend_limit_per_tx_usd'     => 'decimal:6',
        'spend_limit_per_day_usd'    => 'decimal:6',
        'spend_limit_per_month_usd'  => 'decimal:6',
        'require_approval_above_usd' => 'decimal:6',
        'allowed_addresses'          => 'array',
        'allowed_contracts'          => 'array',
        'blocked_selectors'          => 'array',
        'require_approval_selectors' => 'array',
        'schedule'                   => 'array',
        'is_active'                  => 'boolean',
        'risk_scan_enabled'          => 'boolean',
    ];

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }
}
