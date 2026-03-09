<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TokenRegistry extends Model
{
    protected $table = 'token_registry';
    public $timestamps = false;
    public $incrementing = false;
    protected $primaryKey = null;

    protected $fillable = [
        'chain_id', 'address', 'symbol', 'decimals', 'is_stable', 'coingecko_id',
    ];

    protected $casts = [
        'is_stable' => 'boolean',
        'decimals'  => 'integer',
        'chain_id'  => 'integer',
    ];
}
