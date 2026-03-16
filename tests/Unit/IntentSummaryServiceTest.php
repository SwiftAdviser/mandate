<?php

namespace Tests\Unit;

use App\Models\TokenRegistry;
use App\Models\TxIntent;
use App\Services\IntentSummaryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IntentSummaryServiceTest extends TestCase
{
    use RefreshDatabase;

    private IntentSummaryService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new IntentSummaryService();

        // Seed token registry
        TokenRegistry::create([
            'chain_id'  => 84532,
            'address'   => '0x036cbd53842c5426634e7929541ec2318f3dcf7e',
            'symbol'    => 'USDC',
            'decimals'  => 6,
            'is_stable' => true,
        ]);
        TokenRegistry::create([
            'chain_id'  => 84532,
            'address'   => '0x4200000000000000000000000000000000000006',
            'symbol'    => 'WETH',
            'decimals'  => 18,
            'is_stable' => false,
        ]);
    }

    public function test_transfer_summary(): void
    {
        $intent = $this->makeIntent([
            'decoded_action'     => 'transfer',
            'decoded_token'      => '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
            'decoded_raw_amount' => '100000000',
            'decoded_recipient'  => '0xdeadbeef1234567890abcdef1234567890abcdef',
            'chain_id'           => 84532,
        ]);

        $this->assertEquals(
            'Transfer 100 USDC to 0xdead...cdef',
            $this->service->summarize($intent)
        );
    }

    public function test_native_transfer_summary(): void
    {
        $intent = $this->makeIntent([
            'decoded_action'     => 'native_transfer',
            'decoded_recipient'  => '0xdeadbeef1234567890abcdef1234567890abcdef',
            'value_wei'          => '500000000000000000',
            'chain_id'           => 84532,
        ]);

        $this->assertEquals(
            'Send 0.5 ETH to 0xdead...cdef',
            $this->service->summarize($intent)
        );
    }

    public function test_approve_summary(): void
    {
        $intent = $this->makeIntent([
            'decoded_action'     => 'approve',
            'decoded_token'      => '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
            'decoded_raw_amount' => '500000000',
            'decoded_recipient'  => '0xrouter1234567890abcdef1234567890abcdef12',
            'chain_id'           => 84532,
        ]);

        $this->assertEquals(
            'Approve 500 USDC spending for 0xrout...ef12',
            $this->service->summarize($intent)
        );
    }

    public function test_swap_summary(): void
    {
        $intent = $this->makeIntent([
            'decoded_action' => 'swap',
            'to_address'     => '0xrouter1234567890abcdef1234567890abcdef12',
            'calldata'       => '0x38ed1739',
            'chain_id'       => 84532,
        ]);

        $this->assertEquals(
            'Swap via 0xrout...ef12 (0x38ed1739)',
            $this->service->summarize($intent)
        );
    }

    public function test_transfer_from_summary(): void
    {
        $intent = $this->makeIntent([
            'decoded_action'     => 'transfer_from',
            'decoded_token'      => '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
            'decoded_raw_amount' => '100000000',
            'decoded_recipient'  => '0xrouter1234567890abcdef1234567890abcdef12',
            'chain_id'           => 84532,
        ]);

        $this->assertEquals(
            'TransferFrom 100 USDC via 0xrout...ef12',
            $this->service->summarize($intent)
        );
    }

    public function test_unknown_action_summary(): void
    {
        $intent = $this->makeIntent([
            'decoded_action' => 'unknown',
            'to_address'     => '0xdeadbeef1234567890abcdef1234567890abcdef',
            'calldata'       => '0xa9059cbb',
            'chain_id'       => 84532,
        ]);

        $this->assertEquals(
            'Call 0xa9059cbb on 0xdead...cdef',
            $this->service->summarize($intent)
        );
    }

    public function test_null_action_no_calldata_summary(): void
    {
        $intent = $this->makeIntent([
            'decoded_action' => null,
            'to_address'     => '0xdeadbeef1234567890abcdef1234567890abcdef',
            'calldata'       => '0x',
            'value_wei'      => '0',
            'chain_id'       => 84532,
        ]);

        $this->assertEquals(
            'Send 0 ETH to 0xdead...cdef',
            $this->service->summarize($intent)
        );
    }

    public function test_transfer_with_decimal_amount(): void
    {
        $intent = $this->makeIntent([
            'decoded_action'     => 'transfer',
            'decoded_token'      => '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
            'decoded_raw_amount' => '1500000',
            'decoded_recipient'  => '0xdeadbeef1234567890abcdef1234567890abcdef',
            'chain_id'           => 84532,
        ]);

        $this->assertEquals(
            'Transfer 1.5 USDC to 0xdead...cdef',
            $this->service->summarize($intent)
        );
    }

    public function test_transfer_unknown_token(): void
    {
        $intent = $this->makeIntent([
            'decoded_action'     => 'transfer',
            'decoded_token'      => '0x0000000000000000000000000000000000000999',
            'decoded_raw_amount' => '1000000',
            'decoded_recipient'  => '0xdeadbeef1234567890abcdef1234567890abcdef',
            'chain_id'           => 84532,
        ]);

        $this->assertEquals(
            'Transfer 1000000 tokens to 0xdead...cdef',
            $this->service->summarize($intent)
        );
    }

    public function test_native_transfer_large_amount(): void
    {
        $intent = $this->makeIntent([
            'decoded_action'    => 'native_transfer',
            'decoded_recipient' => '0xdeadbeef1234567890abcdef1234567890abcdef',
            'value_wei'         => '2500000000000000000',
            'chain_id'          => 84532,
        ]);

        $this->assertEquals(
            'Send 2.5 ETH to 0xdead...cdef',
            $this->service->summarize($intent)
        );
    }

    private function makeIntent(array $attrs): TxIntent
    {
        $defaults = [
            'id'             => fake()->uuid(),
            'agent_id'       => fake()->uuid(),
            'chain_id'       => 84532,
            'nonce'          => 0,
            'to_address'     => '0x0000000000000000000000000000000000000000',
            'calldata'       => '0x',
            'value_wei'      => '0',
            'gas_limit'      => '100000',
            'max_fee_per_gas'          => '1000000000',
            'max_priority_fee_per_gas' => '1000000000',
            'intent_hash'    => '0x' . str_repeat('ab', 32),
            'status'         => TxIntent::STATUS_RESERVED,
        ];

        return new TxIntent(array_merge($defaults, $attrs));
    }
}
