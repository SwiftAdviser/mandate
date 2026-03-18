<?php

namespace Tests\Unit;

use App\Models\Agent;
use App\Models\Policy;
use App\Models\TokenRegistry;
use App\Models\TxIntent;
use App\Models\User;
use App\Services\AlchemyTransferSearchService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class AlchemyTransferSearchServiceTest extends TestCase
{
    use RefreshDatabase;

    private AlchemyTransferSearchService $service;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new AlchemyTransferSearchService();
        $this->user = User::factory()->create();

        config([
            'mandate.rpc.84532'                      => 'https://base-sepolia.g.alchemy.com/v2/',
            'mandate.alchemy_api_key'                => 'test-key',
            'mandate.preflight.lookback_blocks'      => 1000,
            'mandate.preflight.amount_tolerance_pct' => 5.0,
        ]);
    }

    private function createAgent(array $overrides = []): Agent
    {
        return Agent::create(array_merge([
            'id'          => Str::uuid(),
            'name'        => 'TestAgent',
            'evm_address' => '0xSenderAddr',
            'chain_id'    => 84532,
            'user_id'     => $this->user->id,
        ], $overrides));
    }

    private function createPolicy(Agent $agent): Policy
    {
        return Policy::create([
            'agent_id'               => $agent->id,
            'spend_limit_per_tx_usd' => 1000,
            'is_active'              => true,
            'version'                => 1,
        ]);
    }

    private function createIntent(Agent $agent, array $overrides = []): TxIntent
    {
        $policy = $this->createPolicy($agent);
        $intentId = Str::uuid()->toString();
        $createdAt = $overrides['created_at'] ?? now()->subMinutes(5);
        unset($overrides['created_at']);

        $intent = TxIntent::create(array_merge([
            'id'                       => $intentId,
            'agent_id'                 => $agent->id,
            'policy_id'                => $policy->id,
            'intent_hash'              => '0x' . hash('sha256', 'preflight:' . $intentId),
            'chain_id'                 => 84532,
            'nonce'                    => 0,
            'to_address'               => '0x0000000000000000000000000000000000000000',
            'calldata'                 => '0x',
            'value_wei'                => '0',
            'gas_limit'                => '0',
            'max_fee_per_gas'          => '0',
            'max_priority_fee_per_gas' => '0',
            'status'                   => TxIntent::STATUS_PREFLIGHT,
            'decoded_recipient'        => '0xRecipientAddr',
            'decoded_token'            => 'USDC',
            'amount_usd_computed'      => '10.000000',
        ], $overrides));

        // Update created_at directly via DB to bypass Eloquent timestamp auto-set
        \Illuminate\Support\Facades\DB::table('tx_intents')
            ->where('id', $intent->id)
            ->update(['created_at' => $createdAt]);
        $intent->refresh();

        return $intent;
    }

    public function test_returns_null_when_agent_has_no_evm_address(): void
    {
        $agent  = $this->createAgent(['evm_address' => null]);
        $intent = $this->createIntent($agent);

        $result = $this->service->findMatchingTransfer($intent);

        $this->assertNull($result);
    }

    public function test_returns_null_when_no_rpc_configured_for_chain(): void
    {
        $agent  = $this->createAgent();
        $intent = $this->createIntent($agent, ['chain_id' => 99999]);

        $result = $this->service->findMatchingTransfer($intent);

        $this->assertNull($result);
    }

    public function test_builds_correct_rpc_payload_with_token_filter(): void
    {
        TokenRegistry::create([
            'chain_id'  => 84532,
            'address'   => '0xUSDCAddress',
            'symbol'    => 'USDC',
            'decimals'  => 6,
            'is_stable' => true,
        ]);

        $agent  = $this->createAgent();
        $intent = $this->createIntent($agent);

        Http::fake([
            '*' => Http::sequence()
                ->push(['jsonrpc' => '2.0', 'id' => 1, 'result' => '0x100000'])
                ->push(['jsonrpc' => '2.0', 'id' => 2, 'result' => ['transfers' => []]]),
        ]);

        $this->service->findMatchingTransfer($intent);

        Http::assertSentCount(2);

        Http::assertSent(function ($request) {
            $body = $request->data();
            if (($body['method'] ?? '') !== 'alchemy_getAssetTransfers') return false;

            $params = $body['params'][0] ?? [];
            return $params['fromAddress'] === '0xSenderAddr'
                && $params['toAddress'] === '0xRecipientAddr'
                && $params['category'] === ['erc20']
                && $params['contractAddresses'] === ['0xUSDCAddress']
                && $params['order'] === 'desc';
        });
    }

    public function test_builds_payload_without_contract_filter_when_token_not_in_registry(): void
    {
        $agent  = $this->createAgent();
        $intent = $this->createIntent($agent, ['decoded_token' => 'UNKNOWN']);

        Http::fake([
            '*' => Http::sequence()
                ->push(['jsonrpc' => '2.0', 'id' => 1, 'result' => '0x100000'])
                ->push(['jsonrpc' => '2.0', 'id' => 2, 'result' => ['transfers' => []]]),
        ]);

        $this->service->findMatchingTransfer($intent);

        Http::assertSent(function ($request) {
            $body = $request->data();
            if (($body['method'] ?? '') !== 'alchemy_getAssetTransfers') return false;

            $params = $body['params'][0] ?? [];
            return !isset($params['contractAddresses'])
                && $params['category'] === ['erc20', 'external'];
        });
    }

    public function test_returns_matching_transfer(): void
    {
        $agent  = $this->createAgent();
        $intent = $this->createIntent($agent);

        $transferTimestamp = now()->subMinutes(3)->toIso8601String();

        Http::fake([
            '*' => Http::sequence()
                ->push(['jsonrpc' => '2.0', 'id' => 1, 'result' => '0x100000'])
                ->push(['jsonrpc' => '2.0', 'id' => 2, 'result' => ['transfers' => [
                    [
                        'hash'     => '0xMatchingTxHash',
                        'blockNum' => '0xABC',
                        'value'    => 10.0,
                        'metadata' => ['blockTimestamp' => $transferTimestamp],
                    ],
                ]]]),
        ]);

        $result = $this->service->findMatchingTransfer($intent);

        $this->assertNotNull($result);
        $this->assertEquals('0xMatchingTxHash', $result['hash']);
        $this->assertEquals('0xABC', $result['blockNum']);
    }

    public function test_filters_transfers_before_intent_creation(): void
    {
        $agent  = $this->createAgent();
        $intent = $this->createIntent($agent);

        $beforeCreation = now()->subMinutes(10)->toIso8601String();

        Http::fake([
            '*' => Http::sequence()
                ->push(['jsonrpc' => '2.0', 'id' => 1, 'result' => '0x100000'])
                ->push(['jsonrpc' => '2.0', 'id' => 2, 'result' => ['transfers' => [
                    [
                        'hash'     => '0xOldTx',
                        'blockNum' => '0xABC',
                        'value'    => 10.0,
                        'metadata' => ['blockTimestamp' => $beforeCreation],
                    ],
                ]]]),
        ]);

        $result = $this->service->findMatchingTransfer($intent);

        $this->assertNull($result);
    }

    public function test_filters_transfers_outside_amount_tolerance(): void
    {
        $agent  = $this->createAgent();
        $intent = $this->createIntent($agent, ['amount_usd_computed' => '10.000000']);

        $recentTimestamp = now()->subMinutes(2)->toIso8601String();

        Http::fake([
            '*' => Http::sequence()
                ->push(['jsonrpc' => '2.0', 'id' => 1, 'result' => '0x100000'])
                ->push(['jsonrpc' => '2.0', 'id' => 2, 'result' => ['transfers' => [
                    [
                        'hash'     => '0xTooExpensive',
                        'blockNum' => '0xABC',
                        'value'    => 20.0,
                        'metadata' => ['blockTimestamp' => $recentTimestamp],
                    ],
                ]]]),
        ]);

        $result = $this->service->findMatchingTransfer($intent);

        $this->assertNull($result);
    }

    public function test_skips_transfers_with_hash_already_used(): void
    {
        $agent = $this->createAgent();

        // Existing intent already has this tx_hash
        $this->createIntent($agent, [
            'tx_hash' => '0xAlreadyUsed',
            'status'  => TxIntent::STATUS_CONFIRMED,
        ]);

        $intent = $this->createIntent($agent, [
            'created_at' => now()->subMinutes(5),
        ]);

        $recentTimestamp = now()->subMinutes(2)->toIso8601String();

        Http::fake([
            '*' => Http::sequence()
                ->push(['jsonrpc' => '2.0', 'id' => 1, 'result' => '0x100000'])
                ->push(['jsonrpc' => '2.0', 'id' => 2, 'result' => ['transfers' => [
                    [
                        'hash'     => '0xAlreadyUsed',
                        'blockNum' => '0xABC',
                        'value'    => 10.0,
                        'metadata' => ['blockTimestamp' => $recentTimestamp],
                    ],
                ]]]),
        ]);

        $result = $this->service->findMatchingTransfer($intent);

        $this->assertNull($result);
    }

    public function test_picks_closest_transfer_in_time(): void
    {
        $agent  = $this->createAgent();
        $intent = $this->createIntent($agent);

        $closerTimestamp  = now()->subMinutes(4)->toIso8601String();
        $fartherTimestamp = now()->subMinutes(1)->toIso8601String();

        Http::fake([
            '*' => Http::sequence()
                ->push(['jsonrpc' => '2.0', 'id' => 1, 'result' => '0x100000'])
                ->push(['jsonrpc' => '2.0', 'id' => 2, 'result' => ['transfers' => [
                    [
                        'hash'     => '0xFarther',
                        'blockNum' => '0xABC',
                        'value'    => 10.0,
                        'metadata' => ['blockTimestamp' => $fartherTimestamp],
                    ],
                    [
                        'hash'     => '0xCloser',
                        'blockNum' => '0xDEF',
                        'value'    => 10.0,
                        'metadata' => ['blockTimestamp' => $closerTimestamp],
                    ],
                ]]]),
        ]);

        $result = $this->service->findMatchingTransfer($intent);

        $this->assertNotNull($result);
        $this->assertEquals('0xCloser', $result['hash']);
    }
}
