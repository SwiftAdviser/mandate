<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ScanEvent extends Model
{
    use HasUuids;

    const UPDATED_AT = null;

    protected $fillable = [
        'files_scanned',
        'unprotected',
        'ip',
    ];

    protected $casts = [
        'files_scanned' => 'integer',
        'unprotected' => 'integer',
    ];
}
