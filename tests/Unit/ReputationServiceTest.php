<?php

namespace Tests\Unit;

use App\Services\ReputationService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ReputationServiceTest extends TestCase
{
    private const WALLET = '0xabcdef1234567890abcdef1234567890abcdef12';

    private const CHAIN_ID = 84532; // Base Sepolia

    protected function setUp(): void
    {
        parent::setUp();

        Http::preventStrayRequests();
        Cache::flush();

        config(['mandate.reputation.enabled' => true]);
        config(['mandate.reputation.cache_ttl' => 300]);
        config(['mandate.reputation.subgraphs' => [
            84532 => 'https://gateway.thegraph.com/api/test/subgraphs/id/base-sepolia',
            8453 => 'https://gateway.thegraph.com/api/test/subgraphs/id/base-mainnet',
        ]]);
    }

    private function service(): ReputationService
    {
        return app(ReputationService::class);
    }

    /** @test */
    public function it_returns_registered_with_score_for_known_agent(): void
    {
        Http::fake([
            'https://gateway.thegraph.com/api/test/subgraphs/id/base-sepolia' => Http::sequence()
                // First call: agent lookup
                ->push(['data' => ['agents' => [
                    ['id' => 'agent-123', 'agentId' => 'eip8004-agent-1', 'chainId' => '84532', 'name' => 'TestBot'],
                ]]])
                // Second call: feedbacks
                ->push(['data' => ['feedbacks' => [
                    ['id' => 'fb1', 'value' => '80', 'clientAddress' => '0xaaa', 'tag1' => '', 'tag2' => '', 'createdAt' => '1710000000'],
                    ['id' => 'fb2', 'value' => '60', 'clientAddress' => '0xbbb', 'tag1' => '', 'tag2' => '', 'createdAt' => '1710000001'],
                ]]]),
        ]);

        $result = $this->service()->check(self::WALLET, self::CHAIN_ID);

        $this->assertTrue($result['registered']);
        $this->assertSame('eip8004-agent-1', $result['agent_id']);
        $this->assertEquals(70.0, $result['score']); // (80 + 60) / 2
        $this->assertSame(2, $result['feedback_count']);
        $this->assertFalse($result['degraded']);
    }

    /** @test */
    public function it_returns_unregistered_for_unknown_wallet(): void
    {
        Http::fake([
            'https://gateway.thegraph.com/api/test/subgraphs/id/base-sepolia' => Http::response([
                'data' => ['agents' => []],
            ]),
        ]);

        $result = $this->service()->check(self::WALLET, self::CHAIN_ID);

        $this->assertFalse($result['registered']);
        $this->assertNull($result['agent_id']);
        $this->assertNull($result['score']);
        $this->assertSame(0, $result['feedback_count']);
        $this->assertFalse($result['degraded']);
    }

    /** @test */
    public function it_returns_degraded_when_subgraph_is_down(): void
    {
        Http::fake([
            'https://gateway.thegraph.com/api/test/subgraphs/id/base-sepolia' => Http::response(null, 500),
        ]);

        $result = $this->service()->check(self::WALLET, self::CHAIN_ID);

        $this->assertTrue($result['degraded']);
        $this->assertFalse($result['registered']);
    }

    /** @test */
    public function it_caches_results_for_configured_ttl(): void
    {
        Http::fake([
            'https://gateway.thegraph.com/api/test/subgraphs/id/base-sepolia' => Http::response([
                'data' => ['agents' => []],
            ]),
        ]);

        $this->service()->check(self::WALLET, self::CHAIN_ID);
        $this->service()->check(self::WALLET, self::CHAIN_ID);

        // Only one HTTP call — second was served from cache
        Http::assertSentCount(1);
    }

    /** @test */
    public function it_selects_correct_subgraph_url_by_chain_id(): void
    {
        Http::fake([
            'https://gateway.thegraph.com/api/test/subgraphs/id/base-mainnet' => Http::response([
                'data' => ['agents' => []],
            ]),
        ]);

        $this->service()->check(self::WALLET, 8453);

        Http::assertSent(fn ($request) => str_contains($request->url(), 'base-mainnet'));
    }

    /** @test */
    public function it_returns_unregistered_for_unsupported_chain(): void
    {
        $result = $this->service()->check(self::WALLET, 999999);

        $this->assertFalse($result['registered']);
        $this->assertFalse($result['degraded']);
        Http::assertNothingSent();
    }

    /** @test */
    public function it_returns_null_score_when_no_feedbacks(): void
    {
        Http::fake([
            'https://gateway.thegraph.com/api/test/subgraphs/id/base-sepolia' => Http::sequence()
                ->push(['data' => ['agents' => [
                    ['id' => 'agent-123', 'agentId' => 'eip8004-agent-1', 'chainId' => '84532', 'name' => 'TestBot'],
                ]]])
                ->push(['data' => ['feedbacks' => []]]),
        ]);

        $result = $this->service()->check(self::WALLET, self::CHAIN_ID);

        $this->assertTrue($result['registered']);
        $this->assertNull($result['score']);
        $this->assertSame(0, $result['feedback_count']);
    }
}
