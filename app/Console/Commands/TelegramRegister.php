<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class TelegramRegister extends Command
{
    protected $signature   = 'mandate:telegram-register';
    protected $description = 'Register Telegram webhook URL with the bot API (run once)';

    public function handle(): int
    {
        $botToken = config('mandate.telegram.bot_token');
        $secret = config('mandate.telegram.webhook_secret');

        if (! $botToken) {
            $this->error('Set TELEGRAM_BOT_TOKEN in .env');

            return 1;
        }

        $baseUrl = config('app.url', 'https://api.mandate.krutovoy.me');
        $webhookUrl = "{$baseUrl}/api/telegram/webhook/{$secret}";

        $this->info("Registering webhook: {$webhookUrl}");

        $response = Http::post("https://api.telegram.org/bot{$botToken}/setWebhook", [
            'url' => $webhookUrl,
            'allowed_updates' => ['message'],
        ]);

        if ($response->successful() && $response->json('ok')) {
            $this->info('Webhook registered successfully.');
            $this->line($response->json('description', ''));

            return 0;
        }

        $this->error('Failed: '.($response->json('description') ?? $response->body()));

        return 1;
    }
}
