<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TokenRegistrySeeder extends Seeder
{
    public function run(): void
    {
        $tokens = [
            ['chain_id' => 84532, 'address' => '0x036CbD53842c5426634e7929541eC2318f3dCF7e', 'symbol' => 'USDC', 'decimals' => 6, 'is_stable' => true,  'coingecko_id' => 'usd-coin'],
            ['chain_id' => 8453,  'address' => '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', 'symbol' => 'USDC', 'decimals' => 6, 'is_stable' => true,  'coingecko_id' => 'usd-coin'],
            ['chain_id' => 84532, 'address' => '0x4200000000000000000000000000000000000006', 'symbol' => 'WETH', 'decimals' => 18, 'is_stable' => false, 'coingecko_id' => 'ethereum'],
            ['chain_id' => 8453,  'address' => '0x4200000000000000000000000000000000000006', 'symbol' => 'WETH', 'decimals' => 18, 'is_stable' => false, 'coingecko_id' => 'ethereum'],
        ];

        foreach ($tokens as $token) {
            DB::table('token_registry')->upsert($token, ['chain_id', 'address'], ['symbol', 'decimals', 'is_stable', 'coingecko_id']);
        }
    }
}
