<?php

namespace Tests\Unit\Commands;

use App\Models\Agent;
use App\Models\Policy;
use App\Models\TxIntent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class ReconcileIntentsTest extends TestCase
{
    use RefreshDatabase;

    private const CHAIN_ID    = 84532;
    private const EVM_ADDRESS = '0xabcdef1234567890abcdef1234567890abcdef12';

    protected function setUp(): void
    {
        parent::setUp();

        Http::preventStrayRequests();

        config(['mandate.rpc.84532' => 'https://rpc.test/']);
        config(['mandate.alchemy_api_key' => null]);
    }

    private function createBroadcastedIntent(array $overrides = []): TxIntent
    {
        $agent = Agent::create([
            'id'          => Str::uuid(),
            'name'        => 'TestAgent',
            'evm_address' => self::EVM_ADDRESS,
            'chain_id'    => self::CHAIN_ID,
        ]);

        $policy = Policy::create([
            'agent_id'               => $agent->id,
            'spend_limit_per_tx_usd' => 1000,
            'is_active'              => true,
            'version'                => 1,
        ]);

        return TxIntent::create(array_merge([
            'id'                       => Str::uuid(),
            'agent_id'                 => $agent->id,
            'policy_id'                => $policy->id,
            'chain_id'                 => self::CHAIN_ID,
            'nonce'                    => 0,
            'to_address'               => '0x036cbd53842c5426634e7929541ec2318f3dcf7e',
            'calldata'                 => '0xa9059cbb',
            'value_wei'                => '0',
            'gas_limit'                => '100000',
            'max_fee_per_gas'          => '1000000000',
            'max_priority_fee_per_gas' => '1000000000',
            'status'                   => TxIntent::STATUS_BROADCASTED,
            'intent_hash'              => '0x' . Str::random(64),
            'tx_hash'                  => '0x' . str_repeat('ff', 32),
            'amount_usd_computed'      => 10.0,
        ], $overrides));
    }

    private function fakeRpcResponses(array $responses): void
    {
        Http::fake([
            'https://rpc.test/*' => Http::sequence($responses),
        ]);
    }

    // -------------------------------------------------------------------------
    // Tests
    // -------------------------------------------------------------------------

    /** @test */
    public function it_confirms_intent_when_receipt_is_success(): void
    {
        $intent = $this->createBroadcastedIntent();

        // Two RPC calls: 1) receipt, 2) envelope verify (getTransactionByHash)
        $this->fakeRpcResponses([
            // eth_getTransactionReceipt
            Http::response([
                'jsonrpc' => '2.0', 'id' => 1,
                'result'  => [
                    'status'      => '0x1',
                    'gasUsed'     => '0x5208',
                    'blockNumber' => '0xa',
                ],
            ]),
            // eth_getTransactionByHash (envelope verify)
            Http::response([
                'jsonrpc' => '2.0', 'id' => 1,
                'result'  => [
                    'from'  => self::EVM_ADDRESS,
                    'to'    => '0x036cbd53842c5426634e7929541ec2318f3dcf7e',
                    'nonce' => '0x0',
                    'input' => '0xa9059cbb',
                    'value' => '0x0',
                    'hash'  => $intent->tx_hash,
                ],
            ]),
        ]);

        $this->artisan('mandate:reconcile-intents')->assertSuccessful();

        $intent->refresh();
        $this->assertSame(TxIntent::STATUS_CONFIRMED, $intent->status);
        $this->assertSame('21000', $intent->gas_used);   // 0x5208 = 21000
        $this->assertSame('10', $intent->block_number);  // 0xa = 10
    }

    /** @test */
    public function it_fails_intent_when_receipt_status_not_success(): void
    {
        $intent = $this->createBroadcastedIntent();

        $this->fakeRpcResponses([
            Http::response([
                'jsonrpc' => '2.0', 'id' => 1,
                'result'  => [
                    'status'      => '0x0',
                    'gasUsed'     => '0x5208',
                    'blockNumber' => '0xa',
                ],
            ]),
            // envelope verify
            Http::response([
                'jsonrpc' => '2.0', 'id' => 1,
                'result'  => [
                    'from'  => self::EVM_ADDRESS,
                    'to'    => '0x036cbd53842c5426634e7929541ec2318f3dcf7e',
                    'nonce' => '0x0',
                    'input' => '0xa9059cbb',
                    'value' => '0x0',
                    'hash'  => $intent->tx_hash,
                ],
            ]),
        ]);

        $this->artisan('mandate:reconcile-intents')->assertSuccessful();

        $intent->refresh();
        $this->assertSame(TxIntent::STATUS_FAILED, $intent->status);
    }

    /** @test */
    public function it_fails_intent_on_nonce_replacement(): void
    {
        $intent = $this->createBroadcastedIntent(['nonce' => 3]);

        $this->fakeRpcResponses([
            // receipt: null (not found)
            Http::response(['jsonrpc' => '2.0', 'id' => 1, 'result' => null]),
            // eth_getTransactionCount: nonce 10 > 3
            Http::response(['jsonrpc' => '2.0', 'id' => 1, 'result' => '0xa']),
        ]);

        $this->artisan('mandate:reconcile-intents')->assertSuccessful();

        $intent->refresh();
        $this->assertSame(TxIntent::STATUS_FAILED, $intent->status);
        $this->assertSame('nonce_replaced_tx_dropped', $intent->block_reason);
    }

    /** @test */
    public function it_skips_intent_when_no_receipt_and_nonce_not_replaced(): void
    {
        $intent = $this->createBroadcastedIntent(['nonce' => 5]);

        $this->fakeRpcResponses([
            // receipt: null
            Http::response(['jsonrpc' => '2.0', 'id' => 1, 'result' => null]),
            // nonce count: 5 = same, not replaced
            Http::response(['jsonrpc' => '2.0', 'id' => 1, 'result' => '0x5']),
        ]);

        $this->artisan('mandate:reconcile-intents')->assertSuccessful();

        $intent->refresh();
        $this->assertSame(TxIntent::STATUS_BROADCASTED, $intent->status);
    }

    /** @test */
    public function it_trips_circuit_breaker_on_envelope_mismatch(): void
    {
        $intent = $this->createBroadcastedIntent();

        $this->fakeRpcResponses([
            // receipt
            Http::response([
                'jsonrpc' => '2.0', 'id' => 1,
                'result'  => ['status' => '0x1', 'gasUsed' => '0x5208', 'blockNumber' => '0xa'],
            ]),
            // envelope verify — different 'to' address
            Http::response([
                'jsonrpc' => '2.0', 'id' => 1,
                'result'  => [
                    'from'  => self::EVM_ADDRESS,
                    'to'    => '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
                    'nonce' => '0x0',
                    'input' => '0xa9059cbb',
                    'value' => '0x0',
                ],
            ]),
        ]);

        $this->artisan('mandate:reconcile-intents')->assertSuccessful();

        $intent->refresh();
        $this->assertSame(TxIntent::STATUS_FAILED, $intent->status);

        $intent->agent->refresh();
        $this->assertTrue($intent->agent->circuit_breaker_active);
    }

    /** @test */
    public function it_expires_stale_reserved_intents(): void
    {
        $intent = $this->createBroadcastedIntent([
            'status'     => TxIntent::STATUS_RESERVED,
            'tx_hash'    => null,
            'expires_at' => now()->subMinutes(20),
        ]);

        Http::fake(); // no RPC calls expected for non-broadcasted

        $this->artisan('mandate:reconcile-intents')->assertSuccessful();

        $intent->refresh();
        $this->assertSame(TxIntent::STATUS_EXPIRED, $intent->status);
    }

    /** @test */
    public function it_does_not_expire_non_stale_intents(): void
    {
        $intent = $this->createBroadcastedIntent([
            'status'     => TxIntent::STATUS_RESERVED,
            'tx_hash'    => null,
            'expires_at' => now()->addMinutes(10),
        ]);

        Http::fake();

        $this->artisan('mandate:reconcile-intents')->assertSuccessful();

        $intent->refresh();
        $this->assertSame(TxIntent::STATUS_RESERVED, $intent->status);
    }

    /** @test */
    public function it_ignores_intents_without_tx_hash(): void
    {
        $intent = $this->createBroadcastedIntent(['tx_hash' => null]);

        Http::fake();

        $this->artisan('mandate:reconcile-intents')->assertSuccessful();

        $intent->refresh();
        $this->assertSame(TxIntent::STATUS_BROADCASTED, $intent->status);
    }
}
