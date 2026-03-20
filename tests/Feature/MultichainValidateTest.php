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

class MultichainValidateTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Agent $agent;

    private Policy $policy;

    private string $rawKey;

    protected function setUp(): void
    {
        parent::setUp();

        Http::preventStrayRequests();
        Http::fake(['*' => Http::response(['data' => [['prices' => [['value' => '1.00']]]]], 200)]);

        config(['mandate.aegis.enabled' => false]);
        config(['mandate.reputation.enabled' => false]);

        TokenRegistry::create([
            'chain_id' => '84532',
            'address' => '0x036cbd53842c5426634e7929541ec2318f3dcf7e',
            'symbol' => 'USDC',
            'decimals' => 6,
            'is_stable' => true,
        ]);

        $this->user = User::factory()->create();

        $this->agent = Agent::create([
            'id' => Str::uuid(),
            'name' => 'MultichainAgent',
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

    // ── Primary /validate endpoint ────────────────────────────────────

    public function test_validate_with_solana_address(): void
    {
        $response = $this->validate([
            'action' => 'transfer',
            'amount' => '10.00',
            'to' => '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
            'token' => 'USDC',
            'reason' => 'Pay for API access',
            'chain' => 'solana',
        ]);

        $response->assertOk()->assertJsonPath('allowed', true);
        $response->assertJsonPath('action', 'transfer');
    }

    public function test_validate_with_ton_address(): void
    {
        $response = $this->validate([
            'action' => 'transfer',
            'amount' => '5.00',
            'to' => '0:'.str_repeat('a', 64),
            'token' => 'USDT',
            'reason' => 'Pay for service',
            'chain' => 'ton',
        ]);

        $response->assertOk()->assertJsonPath('allowed', true);
    }

    public function test_validate_with_evm_address(): void
    {
        $response = $this->validate([
            'action' => 'transfer',
            'amount' => '10.00',
            'to' => '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
            'token' => 'USDC',
            'reason' => 'Standard EVM transfer',
        ]);

        $response->assertOk()->assertJsonPath('allowed', true);
    }

    public function test_validate_rejects_invalid_address(): void
    {
        $response = $this->validate([
            'action' => 'transfer',
            'to' => 'not-a-valid-address',
            'reason' => 'Bad address test',
        ]);

        $response->assertStatus(422);
    }

    // ── Blocked actions ───────────────────────────────────────────────

    public function test_blocked_actions_check(): void
    {
        $this->policy->update([
            'blocked_actions' => ['swap', 'bridge'],
        ]);

        $response = $this->validate([
            'action' => 'swap',
            'reason' => 'Try to swap',
        ]);

        $response->assertStatus(422)->assertJsonPath('blockReason', 'action_blocked');
    }

    public function test_non_blocked_action_passes(): void
    {
        $this->policy->update([
            'blocked_actions' => ['swap'],
        ]);

        $response = $this->validate([
            'action' => 'transfer',
            'reason' => 'Transfer is fine',
        ]);

        $response->assertOk()->assertJsonPath('allowed', true);
    }

    // ── Approval by action ────────────────────────────────────────────

    public function test_require_approval_actions(): void
    {
        $this->policy->update([
            'require_approval_actions' => ['bridge'],
        ]);

        $response = $this->validate([
            'action' => 'bridge',
            'reason' => 'Bridge to another chain',
        ]);

        $response->assertOk()
            ->assertJsonPath('allowed', true)
            ->assertJsonPath('requiresApproval', true);
    }

    // ── Backwards compat alias ────────────────────────────────────────

    public function test_preflight_alias_works(): void
    {
        $response = $this->withHeaders(['Authorization' => "Bearer {$this->rawKey}"])
            ->postJson('/api/validate/preflight', [
                'action' => 'transfer',
                'reason' => 'Alias test',
            ]);

        $response->assertOk()->assertJsonPath('allowed', true);
    }

    // ── Raw validate still works ──────────────────────────────────────

    public function test_raw_validate_backwards_compat(): void
    {
        $this->agent->update([
            'wallet_address' => '0xabcdef1234567890abcdef1234567890abcdef12',
            'chain_id' => '84532',
        ]);

        $payload = [
            'chainId' => 84532,
            'nonce' => 0,
            'to' => '0x036cbd53842c5426634e7929541ec2318f3dcf7e',
            'calldata' => '0xa9059cbb000000000000000000000000abcdef1234567890abcdef1234567890abcdef120000000000000000000000000000000000000000000000000000000000989680',
            'valueWei' => '0',
            'gasLimit' => '100000',
            'maxFeePerGas' => '1000000000',
            'maxPriorityFeePerGas' => '1000000000',
            'txType' => 2,
            'accessList' => [],
            'reason' => 'Raw validate test',
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
    }

    // ── Address allowlist: case sensitivity ───────────────────────────

    public function test_solana_address_allowlist_is_case_sensitive(): void
    {
        $solanaAddr = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';

        $this->policy->update([
            'allowed_addresses' => [$solanaAddr],
        ]);

        // Exact match: passes
        $response = $this->validate([
            'action' => 'transfer',
            'to' => $solanaAddr,
            'reason' => 'Exact address',
        ]);
        $response->assertOk();

        // Wrong case: fails
        $response = $this->validate([
            'action' => 'transfer',
            'to' => strtolower($solanaAddr),
            'reason' => 'Wrong case',
        ]);
        // strtolower changes base58 chars, so it won't match and won't even pass validation
        // (lowercase solana address is garbage)
        $response->assertStatus(422);
    }

    public function test_evm_address_allowlist_is_case_insensitive(): void
    {
        $this->policy->update([
            'allowed_addresses' => ['0xD8dA6BF26964aF9D7eEd9e03E53415D37aA96045'],
        ]);

        $response = $this->validate([
            'action' => 'transfer',
            'to' => '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
            'reason' => 'Case insensitive check',
        ]);
        $response->assertOk();
    }

    // ── Chain field stored in intent ──────────────────────────────────

    public function test_chain_field_stored_in_intent(): void
    {
        $this->validate([
            'action' => 'transfer',
            'reason' => 'Chain storage test',
            'chain' => 'solana',
        ]);

        $this->assertDatabaseHas('tx_intents', [
            'agent_id' => $this->agent->id,
            'chain_id' => 'solana',
        ]);
    }
}
