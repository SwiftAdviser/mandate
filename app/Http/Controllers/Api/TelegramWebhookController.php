<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramWebhookController extends Controller
{
    /**
     * Telegram Bot webhook — receives updates from @mandatemd_bot.
     * Public endpoint (no auth) — verified by secret path token.
     *
     * When a user sends /start, we cache their username → chat_id mapping.
     * Then when we need to notify @username, we look up their chat_id.
     */
    public function webhook(Request $request, string $secret): JsonResponse
    {
        if ($secret !== config('mandate.telegram.webhook_secret')) {
            return response()->json(['error' => 'unauthorized'], 403);
        }

        $message = $request->input('message');
        if (! $message) {
            return response()->json(['ok' => true]);
        }

        $chatId = (string) ($message['chat']['id'] ?? '');
        $text = $message['text'] ?? '';
        $firstName = $message['from']['first_name'] ?? 'there';
        $username = $message['from']['username'] ?? null;

        if (str_starts_with($text, '/start')) {
            return $this->handleStart($chatId, $firstName, $username);
        }

        return response()->json(['ok' => true]);
    }

    private function handleStart(string $chatId, string $firstName, ?string $username): JsonResponse
    {
        if (! $username) {
            $this->reply($chatId, implode("\n", [
                "Hey {$firstName}!",
                '',
                'Please set a Telegram username in your profile settings first.',
                'Then come back and tap /start again.',
            ]));

            return response()->json(['ok' => true]);
        }

        // Cache username → chat_id (permanent, overwritten on each /start)
        Cache::forever("tg_user:{$username}", $chatId);

        // Also check if any agents already have this username in their webhooks — update chat_id
        $this->backfillChatId($username, $chatId);

        $this->reply($chatId, implode("\n", [
            "Connected, {$firstName}!",
            '',
            "I'll send you approval notifications here when your agent needs a decision.",
            '',
            'You\'ll see:',
            '— What the agent wants to do',
            '— *WHY* the agent wants to do it',
            '— Risk assessment',
            '',
            'Approve or reject from your Mandate dashboard.',
        ]));

        Log::info('Telegram user connected', ['username' => $username, 'chat_id' => $chatId]);

        return response()->json(['ok' => true]);
    }

    /**
     * Backfill chat_id for any agents that have this @username in their notification_webhooks.
     */
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
            Log::warning('Telegram bot token not configured');
            return;
        }

        Http::post("https://api.telegram.org/bot{$botToken}/sendMessage", [
            'chat_id' => $chatId,
            'text' => $text,
            'parse_mode' => 'Markdown',
        ]);
    }
}
