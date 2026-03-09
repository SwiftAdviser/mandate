<?php

return [
    'alchemy_api_key'    => env('ALCHEMY_API_KEY'),
    'coingecko_api_key'  => env('COINGECKO_API_KEY'),

    'privy' => [
        'app_id'     => env('PRIVY_APP_ID'),
        'app_secret' => env('PRIVY_APP_SECRET'),
        'jwks_url'   => env('PRIVY_JWKS_URL', 'https://auth.privy.io/api/v1/apps'),
    ],

    'api_key_prefix' => [
        'live' => 'mndt_live_',
        'test' => 'mndt_test_',
    ],

    'intent_ttl' => [
        'reserved'         => 15 * 60,   // 15 min
        'approval_pending' => 60 * 60,   // 1 hour
        'approved'         => 10 * 60,   // 10 min
    ],

    'circuit_breaker_cache_ttl' => 30, // seconds

    'price_oracle' => [
        'stable_usd' => 1.00,
        'cache_ttl'  => 60, // seconds
    ],

    'rpc' => [
        84532  => 'https://base-sepolia.g.alchemy.com/v2/',
        8453   => 'https://base-mainnet.g.alchemy.com/v2/',
    ],

    'token_registry' => [
        ['chain_id' => 84532, 'address' => '0x036CbD53842c5426634e7929541eC2318f3dCF7e', 'symbol' => 'USDC', 'decimals' => 6, 'is_stable' => true],
        ['chain_id' => 8453,  'address' => '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', 'symbol' => 'USDC', 'decimals' => 6, 'is_stable' => true],
    ],
];
