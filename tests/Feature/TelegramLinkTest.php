<?php

namespace Tests\Feature;

use App\Models\Agent;
use App\Models\Policy;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class TelegramLinkTest extends TestCase
{
    use RefreshDatabase;

    public function test_telegram_start_generates_link_code(): void
    {
        config(['mandate.telegram.webhook_secret' => 'test-secret']);
        config(['mandate.telegram.bot_token' => 'fake-token']);

        // Mock HTTP to avoid real Telegram API calls
        \Illuminate\Support\Facades\Http::fake();

        $response = $this->postJson('/api/telegram/webhook/test-secret', [
            'message' => [
                'text' => '/start',
                'chat' => ['id' => 12345],
                'from' => [
                    'first_name' => 'Roman',
                    'username' => 'testuser',
                ],
            ],
        ]);

        $response->assertStatus(200);

        // Verify a link code was stored in cache
        $chatId = Cache::get('tg_user:testuser');
        $this->assertEquals('12345', $chatId);

        // Check that a link code was generated for this chat
        $code = Cache::get("tg_link_code_chat:12345");
        $this->assertNotNull($code);
        $this->assertEquals(8, strlen($code));

        // Verify reverse lookup works
        $storedChatId = Cache::get("tg_link_code:{$code}");
        $this->assertEquals('12345', $storedChatId);
    }

    public function test_verify_code_links_telegram_to_agent(): void
    {
        $user = User::factory()->create();
        $agent = Agent::create([
            'name' => 'tg-agent',
            'evm_address' => '0xabcdef1234567890abcdef1234567890abcdef12',
            'user_id' => $user->id,
            'claimed_at' => now(),
        ]);
        Policy::create([
            'agent_id' => $agent->id,
            'spend_limit_per_tx_usd' => 100,
            'spend_limit_per_day_usd' => 1000,
            'is_active' => true,
        ]);

        // Simulate: bot generated code ABCD1234 for chat 12345
        $code = 'ABCD1234';
        Cache::put("tg_link_code:{$code}", '12345', 600);
        Cache::put("tg_link_code_chat:12345", $code, 600);

        \Illuminate\Support\Facades\Http::fake();

        $response = $this->actingAs($user)->postJson('/api/telegram/verify-code', [
            'code' => $code,
            'agent_id' => $agent->id,
        ]);

        $response->assertStatus(200)
            ->assertJson(['linked' => true]);

        // Check agent webhooks were updated
        $agent->refresh();
        $webhooks = $agent->notification_webhooks;
        $this->assertNotEmpty($webhooks);
        $this->assertEquals('telegram', $webhooks[0]['type']);
        $this->assertEquals('12345', $webhooks[0]['chat_id']);

        // Code should be consumed
        $this->assertNull(Cache::get("tg_link_code:{$code}"));
    }

    public function test_verify_code_rejects_invalid_code(): void
    {
        $user = User::factory()->create();
        $agent = Agent::create([
            'name' => 'tg-agent',
            'evm_address' => '0xabcdef1234567890abcdef1234567890abcdef12',
            'user_id' => $user->id,
            'claimed_at' => now(),
        ]);

        $response = $this->actingAs($user)->postJson('/api/telegram/verify-code', [
            'code' => 'INVALID1',
            'agent_id' => $agent->id,
        ]);

        $response->assertStatus(422)
            ->assertJson(['error' => 'Invalid or expired code.']);
    }

    public function test_verify_code_requires_auth(): void
    {
        $response = $this->postJson('/api/telegram/verify-code', [
            'code' => 'ABCD1234',
            'agent_id' => 'some-id',
        ]);

        $response->assertStatus(401);
    }
}
