<?php

namespace App\Enums;

enum RiskLevel: string
{
    case SAFE = 'SAFE';
    case LOW = 'LOW';
    case MEDIUM = 'MEDIUM';
    case HIGH = 'HIGH';
    case CRITICAL = 'CRITICAL';
}
