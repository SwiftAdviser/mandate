<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class BlockchainAddress implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $patterns = [
            '/^0x[a-fA-F0-9]{40}$/',                            // EVM
            '/^[1-9A-HJ-NP-Za-km-z]{32,44}$/',                  // Solana (base58)
            '/^(0:[a-fA-F0-9]{64}|[EU]Q[A-Za-z0-9_\-]{46})$/',  // TON
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $value)) {
                return;
            }
        }

        $fail("The $attribute is not a valid blockchain address.");
    }
}
