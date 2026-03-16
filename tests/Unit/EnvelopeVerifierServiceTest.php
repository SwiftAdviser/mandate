<?php

namespace Tests\Unit;

use App\Models\Agent;
use App\Models\Policy;
use App\Models\TxIntent;
use App\Services\EnvelopeVerifierService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class EnvelopeVerifierServiceTest extends TestCase
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

    private function service(): EnvelopeVerifierService
    {
        return app(EnvelopeVerifierService::class);
    }

    private function createIntentWithAgent(array $intentOverrides = []): TxIntent
    {
        $agent = Agent::create([
            'id'          => Str::uuid(),
            'name'        => 'TestAgent',
            'evm_address' => self::EVM_ADDRESS,
            'chain_id'    => self::CHAIN_ID,
        ]);

        $policy = Policy::create([
            'agent_id'               => $agent->id,
            'spend_limit_per_tx_usd' => 100,
            'is_active'              => true,
            'version'                => 1,
        ]);

        return TxIntent::create(array_merge([
            'id'                       => Str::uuid(),
            'agent_id'                 => $agent->id,
            'policy_id'                => $policy->id,
            'chain_id'                 => self::CHAIN_ID,
            'nonce'                    => 5,
            'to_address'               => '0x036cbd53842c5426634e7929541ec2318f3dcf7e',
            'calldata'                 => '0xa9059cbb0000000000000000000000001234',
            'value_wei'                => '0',
            'gas_limit'                => '100000',
            'max_fee_per_gas'          => '1000000000',
            'max_priority_fee_per_gas' => '1000000000',
            'status'                   => TxIntent::STATUS_BROADCASTED,
            'intent_hash'              => '0x' . str_repeat('ab', 32),
        ], $intentOverrides));
    }

    private function rpcTxResponse(array $overrides = []): array
    {
        return array_merge([
            'from'  => self::EVM_ADDRESS,
            'to'    => '0x036cbd53842c5426634e7929541ec2318f3dcf7e',
            'nonce' => '0x5',
            'input' => '0xa9059cbb0000000000000000000000001234',
            'value' => '0x0',
            'hash'  => '0x' . str_repeat('ff', 32),
        ], $overrides);
    }

    // -------------------------------------------------------------------------
    // verify()
    // -------------------------------------------------------------------------

    /** @test */
    public function verify_returns_match_when_envelope_matches(): void
    {
        $intent = $this->createIntentWithAgent();

        Http::fake([
            'https://rpc.test/*' => Http::response([
                'jsonrpc' => '2.0',
                'id'      => 1,
                'result'  => $this->rpcTxResponse(),
            ]),
        ]);

        $result = $this->service()->verify($intent, '0x' . str_repeat('ff', 32));

        $this->assertSame('match', $result);
    }

    /** @test */
    public function verify_returns_mismatch_when_to_address_differs(): void
    {
        $intent = $this->createIntentWithAgent();

        Http::fake([
            'https://rpc.test/*' => Http::response([
                'jsonrpc' => '2.0',
                'id'      => 1,
                'result'  => $this->rpcTxResponse([
                    'to' => '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
                ]),
            ]),
        ]);

        $result = $this->service()->verify($intent, '0xabc');

        $this->assertSame('mismatch', $result);
    }

    /** @test */
    public function verify_returns_mismatch_when_from_address_differs(): void
    {
        $intent = $this->createIntentWithAgent();

        Http::fake([
            'https://rpc.test/*' => Http::response([
                'jsonrpc' => '2.0',
                'id'      => 1,
                'result'  => $this->rpcTxResponse([
                    'from' => '0x0000000000000000000000000000000000000000',
                ]),
            ]),
        ]);

        $result = $this->service()->verify($intent, '0xabc');

        $this->assertSame('mismatch', $result);
    }

    /** @test */
    public function verify_returns_mismatch_when_nonce_differs(): void
    {
        $intent = $this->createIntentWithAgent();

        Http::fake([
            'https://rpc.test/*' => Http::response([
                'jsonrpc' => '2.0',
                'id'      => 1,
                'result'  => $this->rpcTxResponse([
                    'nonce' => '0xa', // 10, not 5
                ]),
            ]),
        ]);

        $result = $this->service()->verify($intent, '0xabc');

        $this->assertSame('mismatch', $result);
    }

    /** @test */
    public function verify_returns_mismatch_when_calldata_differs(): void
    {
        $intent = $this->createIntentWithAgent();

        Http::fake([
            'https://rpc.test/*' => Http::response([
                'jsonrpc' => '2.0',
                'id'      => 1,
                'result'  => $this->rpcTxResponse([
                    'input' => '0xdeadbeef',
                ]),
            ]),
        ]);

        $result = $this->service()->verify($intent, '0xabc');

        $this->assertSame('mismatch', $result);
    }

    /** @test */
    public function verify_returns_mismatch_when_value_differs(): void
    {
        $intent = $this->createIntentWithAgent();

        Http::fake([
            'https://rpc.test/*' => Http::response([
                'jsonrpc' => '2.0',
                'id'      => 1,
                'result'  => $this->rpcTxResponse([
                    'value' => '0x1000', // non-zero
                ]),
            ]),
        ]);

        $result = $this->service()->verify($intent, '0xabc');

        $this->assertSame('mismatch', $result);
    }

    /** @test */
    public function verify_returns_propagation_delay_when_tx_null(): void
    {
        $intent = $this->createIntentWithAgent();

        Http::fake([
            'https://rpc.test/*' => Http::response([
                'jsonrpc' => '2.0',
                'id'      => 1,
                'result'  => null,
            ]),
        ]);

        $result = $this->service()->verify($intent, '0xabc');

        $this->assertSame('propagation_delay', $result);
    }

    /** @test */
    public function verify_returns_propagation_delay_on_rpc_failure(): void
    {
        $intent = $this->createIntentWithAgent();

        Http::fake([
            'https://rpc.test/*' => Http::response([], 500),
        ]);

        $result = $this->service()->verify($intent, '0xabc');

        $this->assertSame('propagation_delay', $result);
    }

    /** @test */
    public function verify_returns_propagation_delay_on_rpc_exception(): void
    {
        $intent = $this->createIntentWithAgent();

        Http::fake([
            'https://rpc.test/*' => fn () => throw new \Exception('timeout'),
        ]);

        $result = $this->service()->verify($intent, '0xabc');

        $this->assertSame('propagation_delay', $result);
    }

    /** @test */
    public function verify_returns_not_found_when_no_rpc_configured(): void
    {
        config(['mandate.rpc.84532' => null]);

        $intent = $this->createIntentWithAgent();

        $result = $this->service()->verify($intent, '0xabc');

        $this->assertSame('not_found', $result);
    }

    /** @test */
    public function verify_appends_alchemy_key_to_rpc_url(): void
    {
        config(['mandate.alchemy_api_key' => 'test-key-123']);

        $intent = $this->createIntentWithAgent();

        Http::fake([
            'https://rpc.test/test-key-123' => Http::response([
                'jsonrpc' => '2.0',
                'id'      => 1,
                'result'  => $this->rpcTxResponse(),
            ]),
        ]);

        $result = $this->service()->verify($intent, '0xabc');

        $this->assertSame('match', $result);
        Http::assertSent(fn ($req) => str_contains($req->url(), 'test-key-123'));
    }

    // -------------------------------------------------------------------------
    // isNonceReplaced()
    // -------------------------------------------------------------------------

    /** @test */
    public function is_nonce_replaced_returns_true_when_onchain_nonce_higher(): void
    {
        $intent = $this->createIntentWithAgent(['nonce' => 5]);

        Http::fake([
            'https://rpc.test/*' => Http::response([
                'jsonrpc' => '2.0',
                'id'      => 1,
                'result'  => '0xa', // 10 > 5
            ]),
        ]);

        $this->assertTrue($this->service()->isNonceReplaced($intent));
    }

    /** @test */
    public function is_nonce_replaced_returns_false_when_nonce_equal(): void
    {
        $intent = $this->createIntentWithAgent(['nonce' => 5]);

        Http::fake([
            'https://rpc.test/*' => Http::response([
                'jsonrpc' => '2.0',
                'id'      => 1,
                'result'  => '0x5',
            ]),
        ]);

        $this->assertFalse($this->service()->isNonceReplaced($intent));
    }

    /** @test */
    public function is_nonce_replaced_returns_false_on_rpc_error(): void
    {
        $intent = $this->createIntentWithAgent();

        Http::fake([
            'https://rpc.test/*' => fn () => throw new \Exception('timeout'),
        ]);

        $this->assertFalse($this->service()->isNonceReplaced($intent));
    }

    /** @test */
    public function is_nonce_replaced_returns_false_when_no_rpc(): void
    {
        config(['mandate.rpc.84532' => null]);

        $intent = $this->createIntentWithAgent();

        $this->assertFalse($this->service()->isNonceReplaced($intent));
    }
}
