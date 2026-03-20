<?php

namespace Tests\Feature;

use App\Models\Agent;
use App\Models\Policy;
use App\Models\TxIntent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class ReconcilePreflightIntentsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Http::preventStrayRequests();

        config([
            'mandate.rpc.84532' => 'https://rpc.test/',
            'mandate.alchemy_api_key' => null,
            'mandate.preflight.reconcile_enabled' => true,
            'mandate.preflight.stale_after_minutes' => 30,
            'mandate.preflight.lookback_blocks' => 1000,
            'mandate.preflight.amount_tolerance_pct' => 5.0,
        ]);
    }

    private function createPreflightIntent(array $agentOverrides = [], array $intentOverrides = []): TxIntent
    {
        $agent = Agent::create(array_merge([
            'id' => Str::uuid(),
            'name' => 'TestAgent',
            'wallet_address' => '0xSenderAddr',
            'chain_id' => '84532',
        ], $agentOverrides));

        $policy = Policy::create([
            'agent_id' => $agent->id,
            'spend_limit_per_tx_usd' => 1000,
            'is_active' => true,
            'version' => 1,
        ]);

        $intentId = Str::uuid()->toString();
        $createdAt = $intentOverrides['created_at'] ?? now()->subMinutes(5);
        unset($intentOverrides['created_at']);

        $intent = TxIntent::create(array_merge([
            'id' => $intentId,
            'agent_id' => $agent->id,
            'policy_id' => $policy->id,
            'intent_hash' => '0x'.hash('sha256', 'preflight:'.$intentId),
            'chain_id' => '84532',
            'nonce' => 0,
            'to_address' => '0x0000000000000000000000000000000000000000',
            'calldata' => '0x',
            'value_wei' => '0',
            'gas_limit' => '0',
            'max_fee_per_gas' => '0',
            'max_priority_fee_per_gas' => '0',
            'status' => TxIntent::STATUS_PREFLIGHT,
            'decoded_recipient' => '0xRecipientAddr',
            'decoded_token' => 'USDC',
            'amount_usd_computed' => '10.000000',
        ], $intentOverrides));

        DB::table('tx_intents')
            ->where('id', $intent->id)
            ->update(['created_at' => $createdAt]);
        $intent->refresh();

        return $intent;
    }

    public function test_enriches_preflight_intent_with_matching_transfer(): void
    {
        $intent = $this->createPreflightIntent();

        $transferTimestamp = now()->subMinutes(3)->toIso8601String();

        Http::fake([
            'https://rpc.test/*' => Http::sequence()
                // eth_blockNumber
                ->push(['jsonrpc' => '2.0', 'id' => 1, 'result' => '0x100000'])
                // alchemy_getAssetTransfers
                ->push(['jsonrpc' => '2.0', 'id' => 2, 'result' => ['transfers' => [
                    [
                        'hash' => '0xFoundTxHash',
                        'blockNum' => '0xABC',
                        'value' => 10.0,
                        'metadata' => ['blockTimestamp' => $transferTimestamp],
                    ],
                ]]])
                // eth_getTransactionReceipt
                ->push(['jsonrpc' => '2.0', 'id' => 3, 'result' => [
                    'status' => '0x1',
                    'gasUsed' => '0x5208',
                    'blockNumber' => '0xABC',
                ]]),
        ]);

        $this->artisan('mandate:reconcile-preflights')->assertSuccessful();

        $intent->refresh();
        $this->assertEquals(TxIntent::STATUS_CONFIRMED, $intent->status);
        $this->assertEquals('0xFoundTxHash', $intent->tx_hash);
        $this->assertEquals((string) hexdec('0x5208'), $intent->gas_used);
        $this->assertEquals((string) hexdec('0xABC'), $intent->block_number);
    }

    public function test_marks_failed_when_receipt_status_is_zero(): void
    {
        $intent = $this->createPreflightIntent();

        $transferTimestamp = now()->subMinutes(3)->toIso8601String();

        Http::fake([
            'https://rpc.test/*' => Http::sequence()
                ->push(['jsonrpc' => '2.0', 'id' => 1, 'result' => '0x100000'])
                ->push(['jsonrpc' => '2.0', 'id' => 2, 'result' => ['transfers' => [
                    [
                        'hash' => '0xFailedTxHash',
                        'blockNum' => '0xABC',
                        'value' => 10.0,
                        'metadata' => ['blockTimestamp' => $transferTimestamp],
                    ],
                ]]])
                ->push(['jsonrpc' => '2.0', 'id' => 3, 'result' => [
                    'status' => '0x0',
                    'gasUsed' => '0x5208',
                    'blockNumber' => '0xABC',
                ]]),
        ]);

        $this->artisan('mandate:reconcile-preflights')->assertSuccessful();

        $intent->refresh();
        $this->assertEquals(TxIntent::STATUS_FAILED, $intent->status);
        $this->assertEquals('0xFailedTxHash', $intent->tx_hash);
    }

    public function test_skips_intent_when_no_matching_transfer_found(): void
    {
        $intent = $this->createPreflightIntent();

        Http::fake([
            'https://rpc.test/*' => Http::sequence()
                ->push(['jsonrpc' => '2.0', 'id' => 1, 'result' => '0x100000'])
                ->push(['jsonrpc' => '2.0', 'id' => 2, 'result' => ['transfers' => []]]),
        ]);

        $this->artisan('mandate:reconcile-preflights')->assertSuccessful();

        $intent->refresh();
        $this->assertEquals(TxIntent::STATUS_PREFLIGHT, $intent->status);
        $this->assertNull($intent->tx_hash);
    }

    public function test_expires_stale_preflight_intents(): void
    {
        $intent = $this->createPreflightIntent([], [
            'created_at' => now()->subMinutes(35), // older than 30 min stale threshold
        ]);

        // No HTTP calls needed for stale expiry
        Http::fake();

        $this->artisan('mandate:reconcile-preflights')->assertSuccessful();

        $intent->refresh();
        $this->assertEquals(TxIntent::STATUS_EXPIRED, $intent->status);
    }

    public function test_skips_agents_without_wallet_address(): void
    {
        $intent = $this->createPreflightIntent(['wallet_address' => null]);

        Http::fake();

        $this->artisan('mandate:reconcile-preflights')->assertSuccessful();

        $intent->refresh();
        $this->assertEquals(TxIntent::STATUS_PREFLIGHT, $intent->status);
        Http::assertNothingSent();
    }

    public function test_creates_audit_event_on_confirmation(): void
    {
        $intent = $this->createPreflightIntent();

        $transferTimestamp = now()->subMinutes(3)->toIso8601String();

        Http::fake([
            'https://rpc.test/*' => Http::sequence()
                ->push(['jsonrpc' => '2.0', 'id' => 1, 'result' => '0x100000'])
                ->push(['jsonrpc' => '2.0', 'id' => 2, 'result' => ['transfers' => [
                    [
                        'hash' => '0xAuditTxHash',
                        'blockNum' => '0xABC',
                        'value' => 10.0,
                        'metadata' => ['blockTimestamp' => $transferTimestamp],
                    ],
                ]]])
                ->push(['jsonrpc' => '2.0', 'id' => 3, 'result' => [
                    'status' => '0x1',
                    'gasUsed' => '0x5208',
                    'blockNumber' => '0xABC',
                ]]),
        ]);

        $this->artisan('mandate:reconcile-preflights')->assertSuccessful();

        $this->assertDatabaseHas('tx_events', [
            'intent_id' => $intent->id,
            'event_type' => TxIntent::STATUS_CONFIRMED,
            'actor_role' => 'system',
        ]);
    }

    public function test_does_nothing_when_reconcile_disabled(): void
    {
        config(['mandate.preflight.reconcile_enabled' => false]);

        $this->createPreflightIntent();

        Http::fake();

        $this->artisan('mandate:reconcile-preflights')->assertSuccessful();

        Http::assertNothingSent();
    }
}
