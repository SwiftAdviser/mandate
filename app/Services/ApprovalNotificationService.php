<?php

namespace App\Services;

use App\Models\Agent;
use App\Models\ApprovalQueue;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Services\IntentSummaryService;

class ApprovalNotificationService
{
    public function notify(ApprovalQueue $approval, Agent $agent): void
    {
        $webhooks = $agent->notification_webhooks ?? [];
        if (empty($webhooks)) {
            return;
        }

        $context = $this->buildContext($approval, $agent);

        foreach ($webhooks as $webhook) {
            try {
                match ($webhook['type'] ?? null) {
                    'slack'    => $this->sendSlack($webhook['url'], $context),
                    'telegram' => $this->sendTelegram($webhook['bot_token'], $webhook['chat_id'], $context),
                    'custom'   => $this->sendCustomWebhook($webhook['url'], $webhook['secret'] ?? '', $context),
                    default    => Log::warning('Unknown webhook type', ['type' => $webhook['type'] ?? 'null']),
                };
            } catch (\Throwable $e) {
                Log::warning('Approval notification failed', [
                    'type'        => $webhook['type'] ?? 'unknown',
                    'approval_id' => $approval->id,
                    'error'       => $e->getMessage(),
                ]);
            }
        }
    }

    public function buildContext(ApprovalQueue $approval, Agent $agent): array
    {
        $intent    = $approval->intent;
        $expiresAt = $approval->expires_at;
        $amountUsd = (float) ($intent->amount_usd_computed ?? 0);

        $summary = app(IntentSummaryService::class)->summarize($intent);

        return [
            'agent_name'    => $agent->name,
            'summary'       => $summary,
            'action'        => $intent->decoded_action ?? 'unknown',
            'amount_usd'    => $amountUsd,
            'recipient'     => $intent->decoded_recipient ?? $intent->to_address,
            'chain_id'      => $intent->chain_id,
            'risk_level'    => $this->computeRiskLevel($amountUsd),
            'expires_at'    => $expiresAt?->toIso8601String(),
            'minutes_left'  => $expiresAt ? (int) now()->diffInMinutes($expiresAt, false) : null,
            'dashboard_url' => config('app.url', 'https://mandate.krutovoy.me') . '/approvals',
            'approval_id'   => $approval->id,
            'intent_id'     => $intent->id,
        ];
    }

    public function computeRiskLevel(float $amountUsd): string
    {
        if ($amountUsd < 50) return 'low';
        if ($amountUsd < 500) return 'medium';
        return 'high';
    }

    public function formatSlackBlocks(array $context): array
    {
        $riskEmoji = match ($context['risk_level']) {
            'low'    => '🟢',
            'medium' => '🟡',
            'high'   => '🔴',
            default  => '⚪',
        };

        return [
            [
                'type' => 'header',
                'text' => ['type' => 'plain_text', 'text' => '🔐 Approval Required'],
            ],
            [
                'type' => 'section',
                'text' => ['type' => 'mrkdwn', 'text' => "*Summary:* {$context['summary']}"],
            ],
            [
                'type'   => 'section',
                'fields' => [
                    ['type' => 'mrkdwn', 'text' => "*Agent:*\n{$context['agent_name']}"],
                    ['type' => 'mrkdwn', 'text' => '*Amount:*\n$' . number_format($context['amount_usd'], 2)],
                    ['type' => 'mrkdwn', 'text' => "*Action:*\n{$context['action']}"],
                    ['type' => 'mrkdwn', 'text' => "*Recipient:*\n" . $this->truncateAddress($context['recipient'])],
                    ['type' => 'mrkdwn', 'text' => "*Risk:*\n{$riskEmoji} {$context['risk_level']}"],
                    ['type' => 'mrkdwn', 'text' => "*Expires:*\n{$context['minutes_left']} min"],
                ],
            ],
            [
                'type'     => 'actions',
                'elements' => [
                    [
                        'type' => 'button',
                        'text' => ['type' => 'plain_text', 'text' => 'Review in Dashboard →'],
                        'url'  => $context['dashboard_url'],
                    ],
                ],
            ],
        ];
    }

    public function formatTelegramMessage(array $context): string
    {
        $riskEmoji = match ($context['risk_level']) {
            'low'    => '🟢',
            'medium' => '🟡',
            'high'   => '🔴',
            default  => '⚪',
        };

        $amount = '$' . number_format($context['amount_usd'], 2);
        $addr   = $this->truncateAddress($context['recipient']);

        return implode("\n", [
            '🔐 *Approval Required*',
            '',
            "*Summary:* {$context['summary']}",
            "*Agent:* {$context['agent_name']}",
            "*Amount:* {$amount}",
            "*Action:* {$context['action']}",
            "*Recipient:* `{$addr}`",
            "*Risk:* {$riskEmoji} {$context['risk_level']}",
            "*Expires:* {$context['minutes_left']} min",
            '',
            "[Review in Dashboard →]({$context['dashboard_url']})",
        ]);
    }

    public function sendTest(Agent $agent): void
    {
        $context = [
            'agent_name'    => $agent->name,
            'action'        => 'erc20_transfer',
            'amount_usd'    => 25.00,
            'recipient'     => '0x0000...test',
            'chain_id'      => $agent->chain_id ?? 84532,
            'risk_level'    => 'low',
            'expires_at'    => now()->addHour()->toIso8601String(),
            'minutes_left'  => 60,
            'dashboard_url' => config('app.url', 'https://mandate.krutovoy.me') . '/approvals',
            'approval_id'   => 'test-approval-id',
            'intent_id'     => 'test-intent-id',
        ];

        foreach ($agent->notification_webhooks ?? [] as $webhook) {
            match ($webhook['type'] ?? null) {
                'slack'    => $this->sendSlack($webhook['url'], $context),
                'telegram' => $this->sendTelegram($webhook['bot_token'], $webhook['chat_id'], $context),
                'custom'   => $this->sendCustomWebhook($webhook['url'], $webhook['secret'] ?? '', $context),
                default    => null,
            };
        }
    }

    private function sendSlack(string $url, array $context): void
    {
        $blocks = $this->formatSlackBlocks($context);

        Http::post($url, [
            'text'   => "🔐 Approval required for {$context['agent_name']} — \${$context['amount_usd']}",
            'blocks' => $blocks,
        ]);
    }

    private function sendTelegram(string $botToken, string $chatId, array $context): void
    {
        $text = $this->formatTelegramMessage($context);

        Http::post("https://api.telegram.org/bot{$botToken}/sendMessage", [
            'chat_id'    => $chatId,
            'text'       => $text,
            'parse_mode' => 'Markdown',
        ]);
    }

    private function sendCustomWebhook(string $url, string $secret, array $context): void
    {
        $payload   = json_encode($context);
        $signature = hash_hmac('sha256', $payload, $secret);

        Http::withHeaders([
            'X-Mandate-Signature' => $signature,
            'Content-Type'        => 'application/json',
        ])->withBody($payload, 'application/json')->post($url);
    }

    private function truncateAddress(string $address): string
    {
        if (strlen($address) <= 13) return $address;
        return substr($address, 0, 6) . '...' . substr($address, -4);
    }
}
