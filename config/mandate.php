<?php

return [
    'alchemy_api_key'    => env('ALCHEMY_API_KEY'),
    'coingecko_api_key'  => env('COINGECKO_API_KEY'),

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
        1        => 'https://eth-mainnet.g.alchemy.com/v2/',
        11155111 => 'https://eth-sepolia.g.alchemy.com/v2/',
        8453     => 'https://base-mainnet.g.alchemy.com/v2/',
        84532    => 'https://base-sepolia.g.alchemy.com/v2/',
    ],

    'aegis' => [
        'enabled'  => env('AEGIS_ENABLED', true),
        'api_key'  => env('WEB3_ANTIVIRUS_API_KEY'),
        'api_url'  => env('WEB3_ANTIVIRUS_API_URL', 'https://api.web3antivirus.io'),
        'timeout'  => 8,
        'retries'  => 2,
        'circuit_breaker' => [
            'threshold'   => 5,
            'window'      => 60,
            'reset_after' => 30,
        ],
    ],

    'reputation' => [
        'enabled'    => env('REPUTATION_ENABLED', true),
        'cache_ttl'  => 300,
        'subgraphs'  => [
            1         => 'https://gateway.thegraph.com/api/' . env('THEGRAPH_API_KEY', '') . '/subgraphs/id/FV6RR6y13rsnCxBAicKuQEwDp8ioEGiNaWaZUmvr1F8k',
            11155111  => 'https://gateway.thegraph.com/api/' . env('THEGRAPH_API_KEY', '') . '/subgraphs/id/6wQRC7geo9XYAhckfmfo8kbMRLeWU8KQd3XsJqFKmZLT',
            8453      => 'https://gateway.thegraph.com/api/' . env('THEGRAPH_API_KEY', '') . '/subgraphs/id/43s9hQRurMGjuYnC1r2ZwS6xSQktbFyXMPMqGKUFJojb',
            84532     => 'https://gateway.thegraph.com/api/' . env('THEGRAPH_API_KEY', '') . '/subgraphs/id/4yYAvQLFjBhBtdRCY7eUWo181VNoTSLLFd5M7FXQAi6u',
        ],
        'thresholds' => [
            'unknown_requires_approval' => true,
            'low_score'                 => 30,
            'high_score'                => 70,
        ],
    ],

    'telegram' => [
        'bot_token'      => env('TELEGRAM_BOT_TOKEN'),
        'bot_username'   => env('TELEGRAM_BOT_USERNAME', 'mandatemd_bot'),
        'webhook_secret' => env('TELEGRAM_WEBHOOK_SECRET', 'mandate-tg-wh-2026'),
    ],

    'reason_scanner' => [
        'llm_enabled' => env('REASON_SCANNER_LLM_ENABLED', false),
        'model'       => env('REASON_SCANNER_MODEL', 'gpt-4o-mini'),
        'api_key'     => env('REASON_SCANNER_API_KEY'),
    ],

    'token_registry' => [
        // Ethereum Mainnet
        ['chain_id' => 1,        'address' => '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'symbol' => 'USDC', 'decimals' => 6, 'is_stable' => true],
        ['chain_id' => 1,        'address' => '0xdAC17F958D2ee523a2206206994597C13D831ec7', 'symbol' => 'USDT', 'decimals' => 6, 'is_stable' => true],
        ['chain_id' => 1,        'address' => '0x6B175474E89094C44Da98b954EedeB131715A767', 'symbol' => 'DAI',  'decimals' => 18, 'is_stable' => true],
        ['chain_id' => 1,        'address' => '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 'symbol' => 'WETH', 'decimals' => 18, 'is_stable' => false],
        // Ethereum Sepolia
        ['chain_id' => 11155111, 'address' => '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', 'symbol' => 'USDC', 'decimals' => 6, 'is_stable' => true],
        // Base Mainnet
        ['chain_id' => 8453,     'address' => '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', 'symbol' => 'USDC', 'decimals' => 6, 'is_stable' => true],
        ['chain_id' => 8453,     'address' => '0x4200000000000000000000000000000000000006', 'symbol' => 'WETH', 'decimals' => 18, 'is_stable' => false],
        // Base Sepolia
        ['chain_id' => 84532,    'address' => '0x036CbD53842c5426634e7929541eC2318f3dCF7e', 'symbol' => 'USDC', 'decimals' => 6, 'is_stable' => true],
    ],
];
