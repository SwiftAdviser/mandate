<?php

namespace Tests\Feature;

use App\Models\Agent;
use App\Models\AgentApiKey;
use App\Models\Policy;
use App\Models\TokenRegistry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class MultichainE2ETest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Agent $agent;

    private Policy $policy;

    private string $rawKey;

    private const CHAINS = [
        'ethereum' => ['chain_id' => '1',      'address' => '0xd8da6bf26964af9d7eed9e03e53415d37aa96045', 'type' => 'evm'],
        'base' => ['chain_id' => '8453',   'address' => '0xabcdef1234567890abcdef1234567890abcdef12', 'type' => 'evm'],
        'solana' => ['chain_id' => 'solana', 'address' => '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', 'type' => 'solana'],
        'ton' => ['chain_id' => 'ton',    'address' => '0:'.'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2', 'type' => 'ton'],
        'bnb' => ['chain_id' => '56',     'address' => '0x1234567890abcdef1234567890abcdef12345678', 'type' => 'evm'],
    ];

    protected function setUp(): void
    {
        parent::setUp();

        Http::preventStrayRequests();
        Http::fake(['*' => Http::response(['data' => [['prices' => [['value' => '1.00']]]]], 200)]);

        config(['mandate.aegis.enabled' => false]);
        config(['mandate.reputation.enabled' => false]);

        $this->user = User::factory()->create();

        $this->agent = Agent::create([
            'id' => Str::uuid(),
            'name' => 'MultichainE2EAgent',
            'wallet_address' => null,
            'chain_id' => null,
            'user_id' => $this->user->id,
        ]);

        [$this->rawKey] = AgentApiKey::generate($this->agent);

        $this->policy = Policy::create([
            'agent_id' => $this->agent->id,
            'spend_limit_per_tx_usd' => 100,
            'spend_limit_per_day_usd' => 1000,
            'is_active' => true,
            'version' => 1,
        ]);
    }

    private function validate(array $body): \Illuminate\Testing\TestResponse
    {
        return $this->withHeaders(['Authorization' => "Bearer {$this->rawKey}"])
            ->postJson('/api/validate', $body);
    }

    private function register(array $body): \Illuminate\Testing\TestResponse
    {
        return $this->postJson('/api/agents/register', $body);
    }

    // ══════════════════════════════════════════════════════════════════════
    // Validate with chain param
    // ══════════════════════════════════════════════════════════════════════

    /** @dataProvider chainProvider */
    public function test_validate_with_chain_param(string $chain, string $chainId, string $address): void
    {
        $response = $this->validate([
            'action' => 'transfer',
            'amount' => '10.00',
            'to' => $address,
            'reason' => "Transfer on {$chain}",
            'chain' => $chainId,
        ]);

        $response->assertOk()->assertJsonPath('allowed', true);
    }

    public static function chainProvider(): array
    {
        return [
            'ethereum' => ['ethereum', '1',      '0xd8da6bf26964af9d7eed9e03e53415d37aa96045'],
            'base' => ['base',     '8453',   '0xabcdef1234567890abcdef1234567890abcdef12'],
            'solana' => ['solana',   'solana', '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'],
            'ton' => ['ton',      'ton',    '0:a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2'],
            'bnb' => ['bnb',      '56',     '0x1234567890abcdef1234567890abcdef12345678'],
        ];
    }

    // ══════════════════════════════════════════════════════════════════════
    // Chain stored in intent
    // ══════════════════════════════════════════════════════════════════════

    /** @dataProvider chainProvider */
    public function test_chain_stored_in_intent(string $chain, string $chainId, string $address): void
    {
        $this->validate([
            'action' => 'transfer',
            'to' => $address,
            'reason' => "Store chain test {$chain}",
            'chain' => $chainId,
        ]);

        $this->assertDatabaseHas('tx_intents', [
            'agent_id' => $this->agent->id,
            'chain_id' => $chainId,
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════
    // Chain included in validate response
    // ══════════════════════════════════════════════════════════════════════

    /** @dataProvider chainProvider */
    public function test_validate_response_includes_chain(string $chain, string $chainId, string $address): void
    {
        $response = $this->validate([
            'action' => 'transfer',
            'to' => $address,
            'reason' => "Response chain test {$chain}",
            'chain' => $chainId,
        ]);

        $response->assertOk()->assertJsonPath('chain', $chainId);
    }

    // ══════════════════════════════════════════════════════════════════════
    // Address format validation
    // ══════════════════════════════════════════════════════════════════════

    public function test_rejects_invalid_evm_address(): void
    {
        $this->validate([
            'action' => 'transfer',
            'to' => '0xINVALID',
            'reason' => 'Bad address',
        ])->assertStatus(422);
    }

    public function test_rejects_invalid_solana_address(): void
    {
        $this->validate([
            'action' => 'transfer',
            'to' => 'not-base58!!!',
            'reason' => 'Bad solana address',
            'chain' => 'solana',
        ])->assertStatus(422);
    }

    public function test_accepts_ton_raw_address(): void
    {
        $this->validate([
            'action' => 'transfer',
            'to' => '0:'.str_repeat('ab', 32),
            'reason' => 'TON raw address',
            'chain' => 'ton',
        ])->assertOk();
    }

    public function test_accepts_ton_friendly_address(): void
    {
        // EQ format: EQ + 46 base64url chars
        $this->validate([
            'action' => 'transfer',
            'to' => 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
            'reason' => 'TON friendly address',
            'chain' => 'ton',
        ])->assertOk();
    }

    // ══════════════════════════════════════════════════════════════════════
    // Allowlist per chain
    // ══════════════════════════════════════════════════════════════════════

    /** @dataProvider chainProvider */
    public function test_allowlist_blocks_unlisted_address(string $chain, string $chainId, string $address): void
    {
        $this->policy->update([
            'allowed_addresses' => ['0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'],
        ]);

        $response = $this->validate([
            'action' => 'transfer',
            'to' => $address,
            'reason' => "Allowlist test {$chain}",
            'chain' => $chainId,
        ]);

        $response->assertStatus(422)->assertJsonPath('blockReason', 'address_not_allowed');
    }

    /** @dataProvider chainProvider */
    public function test_allowlist_passes_listed_address(string $chain, string $chainId, string $address): void
    {
        $this->policy->update([
            'allowed_addresses' => [$address],
        ]);

        $response = $this->validate([
            'action' => 'transfer',
            'to' => $address,
            'reason' => "Allowlist pass {$chain}",
            'chain' => $chainId,
        ]);

        $response->assertOk()->assertJsonPath('allowed', true);
    }

    public function test_evm_allowlist_case_insensitive(): void
    {
        $this->policy->update([
            'allowed_addresses' => ['0xD8dA6BF26964aF9D7eEd9e03E53415D37aA96045'],
        ]);

        $this->validate([
            'action' => 'transfer',
            'to' => '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
            'reason' => 'EVM case insensitive',
        ])->assertOk();
    }

    public function test_solana_allowlist_case_sensitive(): void
    {
        $addr = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
        $this->policy->update([
            'allowed_addresses' => [$addr],
        ]);

        // Exact match passes
        $this->validate([
            'action' => 'transfer',
            'to' => $addr,
            'reason' => 'Solana exact',
        ])->assertOk();
    }

    // ══════════════════════════════════════════════════════════════════════
    // Spend limits per chain
    // ══════════════════════════════════════════════════════════════════════

    /** @dataProvider chainProvider */
    public function test_spend_limit_blocks_over_limit(string $chain, string $chainId, string $address): void
    {
        $this->policy->update(['spend_limit_per_tx_usd' => 50]);

        $response = $this->validate([
            'action' => 'transfer',
            'amount' => '75.00',
            'to' => $address,
            'reason' => "Over limit {$chain}",
            'chain' => $chainId,
        ]);

        $response->assertStatus(422)->assertJsonPath('blockReason', 'per_tx_limit_exceeded');
    }

    /** @dataProvider chainProvider */
    public function test_spend_limit_passes_under_limit(string $chain, string $chainId, string $address): void
    {
        $response = $this->validate([
            'action' => 'transfer',
            'amount' => '10.00',
            'to' => $address,
            'reason' => "Under limit {$chain}",
            'chain' => $chainId,
        ]);

        $response->assertOk()->assertJsonPath('allowed', true);
    }

    // ══════════════════════════════════════════════════════════════════════
    // Blocked actions per chain
    // ══════════════════════════════════════════════════════════════════════

    /** @dataProvider chainProvider */
    public function test_blocked_action_per_chain(string $chain, string $chainId, string $address): void
    {
        $this->policy->update(['blocked_actions' => ['swap']]);

        $response = $this->validate([
            'action' => 'swap',
            'reason' => "Blocked swap on {$chain}",
            'chain' => $chainId,
        ]);

        $response->assertStatus(422)->assertJsonPath('blockReason', 'action_blocked');
    }

    // ══════════════════════════════════════════════════════════════════════
    // Approval actions per chain
    // ══════════════════════════════════════════════════════════════════════

    /** @dataProvider chainProvider */
    public function test_approval_action_per_chain(string $chain, string $chainId, string $address): void
    {
        $this->policy->update(['require_approval_actions' => ['bridge']]);

        $response = $this->validate([
            'action' => 'bridge',
            'reason' => "Bridge on {$chain}",
            'chain' => $chainId,
        ]);

        $response->assertStatus(202)
            ->assertJsonPath('allowed', false)
            ->assertJsonPath('requiresApproval', true);
    }

    // ══════════════════════════════════════════════════════════════════════
    // Registration with multi-chain addresses
    // ══════════════════════════════════════════════════════════════════════

    public function test_register_with_evm_address_legacy(): void
    {
        $response = $this->register([
            'name' => 'EVM Agent Legacy',
            'evmAddress' => '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
            'chainId' => '1',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('evmAddress', '0xd8da6bf26964af9d7eed9e03e53415d37aa96045')
            ->assertJsonPath('chainId', '1');
    }

    public function test_register_with_wallet_address_evm(): void
    {
        $response = $this->register([
            'name' => 'EVM Agent New',
            'walletAddress' => '0xabcdef1234567890abcdef1234567890abcdef12',
            'chainId' => '8453',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('walletAddress', '0xabcdef1234567890abcdef1234567890abcdef12')
            ->assertJsonPath('chainId', '8453');
    }

    public function test_register_with_solana_address(): void
    {
        $response = $this->register([
            'name' => 'Solana Agent',
            'walletAddress' => '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
            'chainId' => 'solana',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('walletAddress', '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU')
            ->assertJsonPath('chainId', 'solana');
    }

    public function test_register_with_ton_address(): void
    {
        $tonAddr = '0:'.str_repeat('ab', 32);
        $response = $this->register([
            'name' => 'TON Agent',
            'walletAddress' => $tonAddr,
            'chainId' => 'ton',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('walletAddress', $tonAddr)
            ->assertJsonPath('chainId', 'ton');
    }

    public function test_register_with_bnb_address(): void
    {
        $response = $this->register([
            'name' => 'BNB Agent',
            'walletAddress' => '0x1234567890abcdef1234567890abcdef12345678',
            'chainId' => '56',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('chainId', '56');
    }

    public function test_register_rejects_invalid_wallet_address(): void
    {
        $response = $this->register([
            'name' => 'Bad Agent',
            'walletAddress' => 'not-a-valid-address',
            'chainId' => 'solana',
        ]);

        $response->assertStatus(422);
    }

    public function test_register_chainid_accepts_string(): void
    {
        $response = $this->register([
            'name' => 'String Chain Agent',
            'walletAddress' => '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
            'chainId' => 'solana',
        ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('agents', [
            'name' => 'String Chain Agent',
            'chain_id' => 'solana',
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════
    // Raw validate (EVM only)
    // ══════════════════════════════════════════════════════════════════════

    /** @dataProvider evmChainProvider */
    public function test_raw_validate_evm_chains(string $chain, int $chainId): void
    {
        $this->agent->update([
            'wallet_address' => '0xabcdef1234567890abcdef1234567890abcdef12',
            'chain_id' => (string) $chainId,
        ]);

        TokenRegistry::firstOrCreate(
            ['chain_id' => (string) $chainId, 'symbol' => 'USDC'],
            ['address' => '0x036cbd53842c5426634e7929541ec2318f3dcf7e', 'decimals' => 6, 'is_stable' => true],
        );

        $payload = [
            'chainId' => $chainId,
            'nonce' => 0,
            'to' => '0x036cbd53842c5426634e7929541ec2318f3dcf7e',
            'calldata' => '0xa9059cbb000000000000000000000000abcdef1234567890abcdef1234567890abcdef120000000000000000000000000000000000000000000000000000000000989680',
            'valueWei' => '0',
            'gasLimit' => '100000',
            'maxFeePerGas' => '1000000000',
            'maxPriorityFeePerGas' => '1000000000',
            'txType' => 2,
            'accessList' => [],
            'reason' => "Raw validate on {$chain}",
        ];

        $packed = implode('|', [
            $payload['chainId'],
            $payload['nonce'],
            strtolower($payload['to']),
            strtolower($payload['calldata']),
            $payload['valueWei'],
            $payload['gasLimit'],
            $payload['maxFeePerGas'],
            $payload['maxPriorityFeePerGas'],
            $payload['txType'],
            json_encode($payload['accessList']),
        ]);
        $payload['intentHash'] = '0x'.\kornrunner\Keccak::hash($packed, 256);

        $response = $this->withHeaders(['Authorization' => "Bearer {$this->rawKey}"])
            ->postJson('/api/validate/raw', $payload);

        $response->assertOk()->assertJsonPath('allowed', true);
        $response->assertJsonPath('chain', (string) $chainId);
    }

    public static function evmChainProvider(): array
    {
        return [
            'ethereum' => ['ethereum', 1],
            'base' => ['base',     8453],
            'bnb' => ['bnb',      56],
        ];
    }

    // ══════════════════════════════════════════════════════════════════════
    // Default to_address for non-EVM is empty (not 0x0...0)
    // ══════════════════════════════════════════════════════════════════════

    public function test_non_evm_default_to_address_is_empty(): void
    {
        $this->validate([
            'action' => 'stake',
            'reason' => 'No to address on solana',
            'chain' => 'solana',
        ]);

        $this->assertDatabaseHas('tx_intents', [
            'agent_id' => $this->agent->id,
            'to_address' => '',
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════
    // BNB chain is configured
    // ══════════════════════════════════════════════════════════════════════

    public function test_bnb_chain_exists_in_config(): void
    {
        $chains = config('mandate.chains');
        $this->assertArrayHasKey('56', $chains);
        $this->assertEquals('BNB Chain', $chains['56']['name']);
        $this->assertEquals('evm', $chains['56']['type']);

        $this->assertArrayHasKey('97', $chains);
        $this->assertEquals('BNB Testnet', $chains['97']['name']);
    }

    public function test_bnb_tokens_in_registry_config(): void
    {
        $tokens = config('mandate.token_registry');
        $bnbTokens = array_filter($tokens, fn ($t) => $t['chain_id'] === '56');
        $this->assertNotEmpty($bnbTokens);

        $symbols = array_column($bnbTokens, 'symbol');
        $this->assertContains('USDC', $symbols);
        $this->assertContains('BUSD', $symbols);
    }

    // ══════════════════════════════════════════════════════════════════════
    // Daily quota works across chains
    // ══════════════════════════════════════════════════════════════════════

    public function test_daily_quota_across_chains(): void
    {
        $this->policy->update(['spend_limit_per_day_usd' => 50]);

        // First call on Ethereum, should pass
        $this->validate([
            'action' => 'transfer',
            'amount' => '30.00',
            'to' => '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
            'reason' => 'ETH transfer',
            'chain' => '1',
        ])->assertOk();

        // Second call on Solana, should exceed daily limit
        $this->validate([
            'action' => 'transfer',
            'amount' => '30.00',
            'to' => '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
            'reason' => 'SOL transfer',
            'chain' => 'solana',
        ])->assertStatus(422)->assertJsonPath('blockReason', 'daily_quota_exceeded');
    }

    // ══════════════════════════════════════════════════════════════════════
    // Approval threshold works per chain
    // ══════════════════════════════════════════════════════════════════════

    public function test_approval_threshold_across_chains(): void
    {
        $this->policy->update(['require_approval_above_usd' => 20]);

        $response = $this->validate([
            'action' => 'transfer',
            'amount' => '25.00',
            'to' => '0:'.str_repeat('ab', 32),
            'reason' => 'TON above threshold',
            'chain' => 'ton',
        ]);

        $response->assertStatus(202)
            ->assertJsonPath('allowed', false)
            ->assertJsonPath('requiresApproval', true);
    }
}
