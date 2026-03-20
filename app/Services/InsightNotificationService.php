<?php

namespace App\Services;

use App\Models\Agent;
use App\Models\PolicyInsight;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class InsightNotificationService
{
    public function notify(PolicyInsight $insight, Agent $agent): void
    {
        $webhooks = $agent->notification_webhooks ?? [];
        if (empty($webhooks)) {
            return;
        }

        foreach ($webhooks as $webhook) {
            try {
                if (($webhook['type'] ?? '') === 'telegram') {
                    $this->sendTelegram(
                        ($webhook['bot_token'] ?? '') ?: config('mandate.telegram.bot_token'),
                        $webhook['chat_id'] ?? '',
                        $webhook['username'] ?? null,
                        $insight,
                    );
                }
            } catch (\Throwable $e) {
                Log::warning('Insight notification failed', [
                    'type'       => $webhook['type'] ?? 'unknown',
                    'insight_id' => $insight->id,
                    'error'      => $e->getMessage(),
                ]);
            }
        }
    }

    private function sendTelegram(string $botToken, string $chatId, ?string $username, PolicyInsight $insight): void
    {
        if (empty($chatId) && $username) {
            $chatId = Cache::get("tg_user:{$username}", '');
        }

        if (empty($chatId)) {
            Log::warning('Insight Telegram skipped: no chat_id', ['username' => $username]);
            return;
        }

        $text    = $this->formatMessage($insight);
        $buttons = $this->buildButtons($insight);

        $payload = [
            'chat_id'      => $chatId,
            'text'         => $text,
            'parse_mode'   => 'HTML',
            'reply_markup' => ['inline_keyboard' => $buttons],
        ];

        Http::post("https://api.telegram.org/bot{$botToken}/sendMessage", $payload);
    }

    private function formatMessage(PolicyInsight $insight): string
    {
        $isMandateRule = $insight->insight_type === PolicyInsight::TYPE_MANDATE_RULE;

        $confidenceBar = str_repeat("\u{2B1B}", (int) round($insight->confidence * 5))
            . str_repeat("\u{2B1C}", 5 - (int) round($insight->confidence * 5));

        $lines = [];

        if ($isMandateRule) {
            $sectionLabels = [
                'block'            => 'Block immediately',
                'require_approval' => 'Require human approval',
                'allow'            => 'Allow',
            ];
            $section = $sectionLabels[$insight->target_section ?? 'block'] ?? $insight->target_section;

            $lines[] = "\u{1F4A1} <b>MANDATE.md Rule Suggestion</b>";
            $lines[] = '';
            $lines[] = "Based on your recent decisions:";
            $lines[] = '';
            $lines[] = "\u{1F4DD} <b>{$section}:</b>";
            $lines[] = "<code>" . htmlspecialchars($insight->suggestion['rule_text'] ?? $insight->title) . "</code>";
        } else {
            $lines[] = "\u{1F4A1} <b>Policy Insight</b>";
            $lines[] = '';
            $lines[] = "\u{1F4CB} " . htmlspecialchars($insight->title);
        }

        $lines[] = '';
        if ($insight->description) {
            $lines[] = htmlspecialchars(substr($insight->description, 0, 200));
        }
        $lines[] = "Confidence: {$confidenceBar} {$insight->confidence}";

        return implode("\n", $lines);
    }

    private function buildButtons(PolicyInsight $insight): array
    {
        $isMandateRule = $insight->insight_type === PolicyInsight::TYPE_MANDATE_RULE;
        $acceptLabel   = $isMandateRule ? "\u{2705} Add Rule" : "\u{2705} Accept";

        return [
            [
                ['text' => $acceptLabel, 'callback_data' => "accept_insight:{$insight->id}"],
                ['text' => "\u{274C} Dismiss", 'callback_data' => "dismiss_insight:{$insight->id}"],
            ],
            [
                ['text' => 'Open Dashboard', 'url' => config('app.url', 'https://app.mandate.md') . '/insights'],
            ],
        ];
    }
}
