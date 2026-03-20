<?php

namespace Tests\Unit;

use App\Models\Agent;
use App\Models\ApprovalQueue;
use App\Models\Policy;
use App\Models\TxIntent;
use App\Services\ApprovalNotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class ApprovalNotificationServiceTest extends TestCase
{
    use RefreshDatabase;

    private function service(): ApprovalNotificationService
    {
        return app(ApprovalNotificationService::class);
    }

    private function createAgentWithWebhooks(array $webhooks): Agent
    {
        return Agent::create([
            'id' => Str::uuid(),
            'name' => 'TraderBot',
            'wallet_address' => '0xabcdef1234567890abcdef1234567890abcdef12',
            'chain_id' => '84532',
            'notification_webhooks' => $webhooks,
        ]);
    }

    private function createApproval(Agent $agent): ApprovalQueue
    {
        $policy = Policy::create([
            'agent_id' => $agent->id,
            'spend_limit_per_tx_usd' => 1000,
            'spend_limit_per_day_usd' => 10000,
            'is_active' => true,
            'version' => 1,
        ]);

        $intent = TxIntent::create([
            'id' => Str::uuid(),
            'agent_id' => $agent->id,
            'policy_id' => $policy->id,
            'intent_hash' => '0x'.str_repeat('ab', 32),
            'chain_id' => '84532',
            'nonce' => 0,
            'to_address' => '0x036cbd53842c5426634e7929541ec2318f3dcf7e',
            'calldata' => '0xa9059cbb',
            'value_wei' => '0',
            'gas_limit' => '100000',
            'max_fee_per_gas' => '1000000000',
            'max_priority_fee_per_gas' => '1000000000',
            'tx_type' => 2,
            'access_list' => '[]',
            'decoded_action' => 'erc20_transfer',
            'amount_usd_computed' => 150.00,
            'status' => TxIntent::STATUS_APPROVAL_PENDING,
            'expires_at' => now()->addHour(),
        ]);

        return ApprovalQueue::create([
            'id' => Str::uuid(),
            'intent_id' => $intent->id,
            'agent_id' => $agent->id,
            'status' => ApprovalQueue::STATUS_PENDING,
            'expires_at' => now()->addHour(),
        ]);
    }

    // ── Context building ─────────────────────────────────────────────────────

    /** @test */
    public function it_builds_context_with_all_required_fields(): void
    {
        $agent = $this->createAgentWithWebhooks([]);
        $approval = $this->createApproval($agent);

        $context = $this->service()->buildContext($approval, $agent);

        $this->assertArrayHasKey('agent_name', $context);
        $this->assertArrayHasKey('action', $context);
        $this->assertArrayHasKey('amount_usd', $context);
        $this->assertArrayHasKey('recipient', $context);
        $this->assertArrayHasKey('chain_id', $context);
        $this->assertArrayHasKey('risk_level', $context);
        $this->assertArrayHasKey('expires_at', $context);
        $this->assertArrayHasKey('minutes_left', $context);
        $this->assertArrayHasKey('dashboard_url', $context);
        $this->assertArrayHasKey('approval_id', $context);
        $this->assertArrayHasKey('intent_id', $context);
        $this->assertEquals('TraderBot', $context['agent_name']);
    }

    // ── Risk level heuristic ─────────────────────────────────────────────────

    /** @test */
    public function risk_level_is_low_under_50_usd(): void
    {
        $this->assertEquals('low', $this->service()->computeRiskLevel(49.99));
    }

    /** @test */
    public function risk_level_is_medium_between_50_and_500_usd(): void
    {
        $this->assertEquals('medium', $this->service()->computeRiskLevel(50.00));
        $this->assertEquals('medium', $this->service()->computeRiskLevel(499.99));
    }

    /** @test */
    public function risk_level_is_high_above_500_usd(): void
    {
        $this->assertEquals('high', $this->service()->computeRiskLevel(500.01));
    }

    // ── Slack formatting ─────────────────────────────────────────────────────

    /** @test */
    public function it_formats_slack_blocks_correctly(): void
    {
        $agent = $this->createAgentWithWebhooks([]);
        $approval = $this->createApproval($agent);
        $context = $this->service()->buildContext($approval, $agent);

        $blocks = $this->service()->formatSlackBlocks($context);

        $this->assertIsArray($blocks);
        // Should contain header, section with fields, actions
        $types = array_column($blocks, 'type');
        $this->assertContains('header', $types);
        $this->assertContains('section', $types);
        $this->assertContains('actions', $types);
    }

    // ── Telegram formatting ──────────────────────────────────────────────────

    /** @test */
    public function it_formats_telegram_markdown(): void
    {
        $agent = $this->createAgentWithWebhooks([]);
        $approval = $this->createApproval($agent);
        $context = $this->service()->buildContext($approval, $agent);

        $text = $this->service()->formatTelegramMessage($context);

        $this->assertStringContains('TraderBot', $text);
        $this->assertStringContains('$150.00', $text);
        $this->assertStringContains('erc20_transfer', $text);
    }

    // ── Webhook dispatch ─────────────────────────────────────────────────────

    /** @test */
    public function it_sends_to_slack_webhook(): void
    {
        Http::fake(['hooks.slack.com/*' => Http::response('ok', 200)]);

        $agent = $this->createAgentWithWebhooks([
            ['type' => 'slack', 'url' => 'https://hooks.slack.com/services/T00/B00/xxx'],
        ]);
        $approval = $this->createApproval($agent);

        $this->service()->notify($approval, $agent);

        Http::assertSent(fn ($req) => str_contains($req->url(), 'hooks.slack.com') &&
            isset($req->data()['blocks'])
        );
    }

    /** @test */
    public function it_sends_to_telegram(): void
    {
        Http::fake(['api.telegram.org/*' => Http::response(['ok' => true], 200)]);

        $agent = $this->createAgentWithWebhooks([
            ['type' => 'telegram', 'chat_id' => '-100123', 'bot_token' => '123:ABC'],
        ]);
        $approval = $this->createApproval($agent);

        $this->service()->notify($approval, $agent);

        Http::assertSent(fn ($req) => str_contains($req->url(), 'api.telegram.org/bot123:ABC/sendMessage') &&
            $req->data()['chat_id'] === '-100123'
        );
    }

    /** @test */
    public function it_sends_custom_webhook_with_hmac_signature(): void
    {
        Http::fake(['example.com/*' => Http::response('ok', 200)]);

        $agent = $this->createAgentWithWebhooks([
            ['type' => 'custom', 'url' => 'https://example.com/webhook', 'secret' => 'my-secret'],
        ]);
        $approval = $this->createApproval($agent);

        $this->service()->notify($approval, $agent);

        Http::assertSent(function ($req) {
            return str_contains($req->url(), 'example.com/webhook') &&
                $req->hasHeader('X-Mandate-Signature');
        });
    }

    /** @test */
    public function it_skips_when_no_webhooks_configured(): void
    {
        Http::fake();

        $agent = $this->createAgentWithWebhooks([]);
        $approval = $this->createApproval($agent);

        $this->service()->notify($approval, $agent);

        Http::assertNothingSent();
    }

    /** @test */
    public function it_handles_http_failure_gracefully(): void
    {
        Http::fake(['hooks.slack.com/*' => Http::response('error', 500)]);

        $agent = $this->createAgentWithWebhooks([
            ['type' => 'slack', 'url' => 'https://hooks.slack.com/services/T00/B00/xxx'],
        ]);
        $approval = $this->createApproval($agent);

        // Should not throw
        $this->service()->notify($approval, $agent);

        $this->assertTrue(true); // no exception
    }

    // Helper for PHP <8.1 compat (assertStringContainsString is verbose)
    private function assertStringContains(string $needle, string $haystack): void
    {
        $this->assertStringContainsString($needle, $haystack);
    }
}
