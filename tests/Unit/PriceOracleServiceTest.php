<?php

namespace Tests\Unit;

use App\Models\TokenRegistry;
use App\Services\PriceOracleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PriceOracleServiceTest extends TestCase
{
    use RefreshDatabase;

    private const CHAIN_ID     = 84532;
    private const USDC_ADDRESS = '0x036cbd53842c5426634e7929541ec2318f3dcf7e';
    private const WETH_ADDRESS = '0x4200000000000000000000000000000000000006';

    protected function setUp(): void
    {
        parent::setUp();

        Http::preventStrayRequests();
        Cache::flush();

        config(['mandate.alchemy_api_key' => 'test-alchemy-key']);
        config(['mandate.coingecko_api_key' => null]);
        config(['mandate.price_oracle.cache_ttl' => 60]);
        config(['mandate.price_oracle.stable_usd' => 1.0]);

        TokenRegistry::create([
            'chain_id'  => self::CHAIN_ID,
            'address'   => self::USDC_ADDRESS,
            'symbol'    => 'USDC',
            'decimals'  => 6,
            'is_stable' => true,
        ]);

        TokenRegistry::create([
            'chain_id'      => self::CHAIN_ID,
            'address'       => self::WETH_ADDRESS,
            'symbol'        => 'WETH',
            'decimals'      => 18,
            'is_stable'     => false,
            'coingecko_id'  => 'ethereum',
        ]);
    }

    private function service(): PriceOracleService
    {
        return app(PriceOracleService::class);
    }

    // -------------------------------------------------------------------------
    // toUsd() — stablecoins
    // -------------------------------------------------------------------------

    /** @test */
    public function stable_coin_returns_usd_without_api_call(): void
    {
        Http::fake(); // No requests should be made

        // 10_000_000 raw / 10^6 = 10.0 USDC × $1.00 = $10.00
        $result = $this->service()->toUsd(self::CHAIN_ID, self::USDC_ADDRESS, '10000000');

        $this->assertEqualsWithDelta(10.0, $result, 0.001);
        Http::assertNothingSent();
    }

    /** @test */
    public function stable_coin_handles_zero_amount(): void
    {
        Http::fake();

        $result = $this->service()->toUsd(self::CHAIN_ID, self::USDC_ADDRESS, '0');

        $this->assertSame(0.0, $result);
    }

    /** @test */
    public function stable_coin_handles_large_amount(): void
    {
        Http::fake();

        // 1_000_000_000_000 raw = 1,000,000 USDC
        $result = $this->service()->toUsd(self::CHAIN_ID, self::USDC_ADDRESS, '1000000000000');

        $this->assertEqualsWithDelta(1_000_000.0, $result, 0.01);
    }

    // -------------------------------------------------------------------------
    // toUsd() — non-stable tokens (needs price API)
    // -------------------------------------------------------------------------

    /** @test */
    public function non_stable_token_fetches_price_from_alchemy(): void
    {
        Http::fake([
            'https://api.g.alchemy.com/*' => Http::response([
                'data' => [['prices' => [['value' => '3500.50']]]],
            ]),
        ]);

        // 1 WETH = 1e18 raw, price $3500.50
        $result = $this->service()->toUsd(self::CHAIN_ID, self::WETH_ADDRESS, '1000000000000000000');

        $this->assertEqualsWithDelta(3500.50, $result, 0.01);
    }

    /** @test */
    public function non_stable_token_falls_back_to_coingecko(): void
    {
        Http::fake([
            'https://api.g.alchemy.com/*' => Http::response([], 500),
            'https://api.coingecko.com/*'  => Http::response([
                'ethereum' => ['usd' => 3200.00],
            ]),
        ]);

        $result = $this->service()->toUsd(self::CHAIN_ID, self::WETH_ADDRESS, '1000000000000000000');

        $this->assertEqualsWithDelta(3200.00, $result, 0.01);
    }

    /** @test */
    public function returns_null_when_both_apis_fail(): void
    {
        Http::fake([
            'https://api.g.alchemy.com/*' => Http::response([], 500),
            'https://api.coingecko.com/*'  => Http::response([], 500),
        ]);

        $result = $this->service()->toUsd(self::CHAIN_ID, self::WETH_ADDRESS, '1000000000000000000');

        $this->assertNull($result);
    }

    /** @test */
    public function returns_null_for_unknown_token(): void
    {
        Http::fake();

        $result = $this->service()->toUsd(self::CHAIN_ID, '0x0000000000000000000000000000000000000000', '1000');

        $this->assertNull($result);
    }

    // -------------------------------------------------------------------------
    // fetchPrice() — caching
    // -------------------------------------------------------------------------

    /** @test */
    public function price_is_cached_after_first_fetch(): void
    {
        Http::fake([
            'https://api.g.alchemy.com/*' => Http::response([
                'data' => [['prices' => [['value' => '3500']]]],
            ]),
        ]);

        $first  = $this->service()->fetchPrice('WETH');
        $second = $this->service()->fetchPrice('WETH');

        $this->assertSame($first, $second);
        // Only one HTTP call should be made
        Http::assertSentCount(1);
    }

    // -------------------------------------------------------------------------
    // fetchPrice() — CoinGecko pro API key
    // -------------------------------------------------------------------------

    /** @test */
    public function uses_coingecko_pro_api_when_key_configured(): void
    {
        config(['mandate.coingecko_api_key' => 'cg-pro-key']);

        Http::fake([
            'https://api.g.alchemy.com/*'     => Http::response([], 500),
            'https://pro-api.coingecko.com/*'  => Http::response([
                'ethereum' => ['usd' => 3100.00],
            ]),
        ]);

        $result = $this->service()->fetchPrice('ethereum');

        $this->assertEqualsWithDelta(3100.00, $result, 0.01);
        Http::assertSent(fn ($req) => str_contains($req->url(), 'pro-api.coingecko.com'));
    }

    /** @test */
    public function uses_coingecko_free_api_when_no_key(): void
    {
        config(['mandate.coingecko_api_key' => null]);

        Http::fake([
            'https://api.g.alchemy.com/*'   => Http::response([], 500),
            'https://api.coingecko.com/*'    => Http::response([
                'ethereum' => ['usd' => 3000.00],
            ]),
        ]);

        $result = $this->service()->fetchPrice('ethereum');

        $this->assertEqualsWithDelta(3000.00, $result, 0.01);
        Http::assertSent(fn ($req) => str_contains($req->url(), 'api.coingecko.com/api/v3'));
    }

    // -------------------------------------------------------------------------
    // toUsd() — address normalization
    // -------------------------------------------------------------------------

    /** @test */
    public function token_lookup_is_case_insensitive(): void
    {
        Http::fake();

        // Upper-case address should still match
        $result = $this->service()->toUsd(
            self::CHAIN_ID,
            strtoupper(self::USDC_ADDRESS),
            '5000000'
        );

        $this->assertEqualsWithDelta(5.0, $result, 0.001);
    }

    /** @test */
    public function alchemy_returns_null_data_falls_back(): void
    {
        Http::fake([
            'https://api.g.alchemy.com/*' => Http::response([
                'data' => [['prices' => [['value' => null]]]],
            ]),
            'https://api.coingecko.com/*'  => Http::response([
                'ethereum' => ['usd' => 2900.00],
            ]),
        ]);

        $result = $this->service()->fetchPrice('ethereum');

        $this->assertEqualsWithDelta(2900.00, $result, 0.01);
    }
}
