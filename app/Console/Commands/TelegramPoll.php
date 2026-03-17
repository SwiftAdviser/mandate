<?php

namespace App\Console\Commands;

use App\Models\Agent;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramPoll extends Command
{
    protected $signature   = 'mandate:telegram-poll';
    protected $description = 'Poll Telegram getUpdates for /start commands, cache username→chat_id';

    public function handle(): int
    {
        $botToken = config('mandate.telegram.bot_token');
        if (! $botToken) {
            $this->warn('TELEGRAM_BOT_TOKEN not set');

            return 1;
        }

        $offset = (int) Cache::get('telegram_poll_offset', 0);

        $response = Http::timeout(35)->get(
            "https://api.telegram.org/bot{$botToken}/getUpdates",
            ['offset' => $offset, 'timeout' => 30, 'allowed_updates' => ['message']],
        );

        if (! $response->successful()) {
            $this->error('Telegram API error: '.$response->status());

            return 1;
        }

        $updates = $response->json('result', []);

        foreach ($updates as $update) {
            $offset = max($offset, $update['update_id'] + 1);
            $this->processUpdate($update, $botToken);
        }

        Cache::put('telegram_poll_offset', $offset);

        if (count($updates) > 0) {
            $this->info('Processed '.count($updates).' update(s)');
        }

        return 0;
    }

    private function processUpdate(array $update, string $botToken): void
    {
        $message = $update['message'] ?? null;
        if (! $message) {
            return;
        }

        $text = $message['text'] ?? '';
        $chatId = (string) ($message['chat']['id'] ?? '');
        $firstName = $message['from']['first_name'] ?? 'there';
        $username = $message['from']['username'] ?? null;

        if (! str_starts_with($text, '/start')) {
            return;
        }

        if (! $username) {
            $this->reply($botToken, $chatId, implode("\n", [
                "Hey {$firstName}!",
                '',
                'Set a Telegram @username in your profile settings, then tap /start again.',
            ]));

            return;
        }

        // Cache username → chat_id
        Cache::forever("tg_user:{$username}", $chatId);

        // Backfill chat_id for agents that already have this @username
        $this->backfillChatId($username, $chatId);

        $this->reply($botToken, $chatId, implode("\n", [
            "Connected, {$firstName}!",
            '',
            "I'll send approval notifications here when your agent needs a decision.",
            '',
            'You\'ll see what the agent wants, *WHY*, and the risk assessment.',
        ]));

        Log::info('Telegram user connected', ['username' => $username, 'chat_id' => $chatId]);
        $this->line("  Connected @{$username} → {$chatId}");
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

    private function reply(string $botToken, string $chatId, string $text): void
    {
        Http::post("https://api.telegram.org/bot{$botToken}/sendMessage", [
            'chat_id' => $chatId,
            'text' => $text,
            'parse_mode' => 'Markdown',
        ]);
    }
}
