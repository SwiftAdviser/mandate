<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramWebhookController extends Controller
{
    /**
     * Telegram Bot webhook — receives updates pushed by Telegram.
     * Public endpoint, verified by secret path segment.
     */
    public function __invoke(Request $request, string $secret): JsonResponse
    {
        if ($secret !== config('mandate.telegram.webhook_secret')) {
            return response()->json(['error' => 'unauthorized'], 403);
        }

        $message = $request->input('message');
        if (! $message || ! str_starts_with($message['text'] ?? '', '/start')) {
            return response()->json(['ok' => true]);
        }

        $chatId = (string) ($message['chat']['id'] ?? '');
        $firstName = $message['from']['first_name'] ?? 'there';
        $username = $message['from']['username'] ?? null;

        if (! $username) {
            $this->reply($chatId, "Hey {$firstName}!\n\nSet a Telegram @username in your profile settings, then tap /start again.");

            return response()->json(['ok' => true]);
        }

        // Cache username → chat_id permanently
        Cache::forever("tg_user:{$username}", $chatId);

        // Backfill chat_id on any agents that already list this @username
        $this->backfillChatId($username, $chatId);

        $this->reply($chatId, implode("\n", [
            "Connected, {$firstName}!",
            '',
            "I'll send approval notifications here when your agent needs a decision.",
            '',
            'You\'ll see what the agent wants, *WHY*, and the risk assessment.',
        ]));

        Log::info('Telegram user connected', ['username' => $username, 'chat_id' => $chatId]);

        return response()->json(['ok' => true]);
    }

    private function backfillChatId(string $username, string $chatId): void
    {
        $agents = Agent::whereNotNull('notification_webhooks')->get();

        foreach ($agents as $agent) {
            $webhooks = $agent->notification_webhooks ?? [];
            $changed = false;

            foreach ($webhooks as &$wh) {
                if (($wh['type'] ?? '') === 'telegram'
                    && ($wh['username'] ?? '') === $username
                    && ($wh['chat_id'] ?? '') !== $chatId
                ) {
                    $wh['chat_id'] = $chatId;
                    $changed = true;
                }
            }
            unset($wh);

            if ($changed) {
                $agent->update(['notification_webhooks' => $webhooks]);
            }
        }
    }

    private function reply(string $chatId, string $text): void
    {
        $botToken = config('mandate.telegram.bot_token');
        if (! $botToken) {
            return;
        }

        Http::post("https://api.telegram.org/bot{$botToken}/sendMessage", [
            'chat_id' => $chatId,
            'text' => $text,
            'parse_mode' => 'Markdown',
        ]);
    }
}
