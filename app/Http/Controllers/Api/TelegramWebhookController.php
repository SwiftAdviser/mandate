<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\RecordDecisionSignal;
use App\Models\Agent;
use App\Models\ApprovalQueue;
use App\Models\PolicyInsight;
use App\Models\TxIntent;
use App\Services\IntentStateMachineService;
use App\Services\PolicyInsightService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramWebhookController extends Controller
{
    public function __invoke(Request $request, string $secret): JsonResponse
    {
        if ($secret !== config('mandate.telegram.webhook_secret')) {
            return response()->json(['error' => 'unauthorized'], 403);
        }

        // Route: callback_query (button press) or message (/start)
        if ($request->has('callback_query')) {
            return $this->handleCallback($request->input('callback_query'));
        }

        $message = $request->input('message');
        if ($message && str_starts_with($message['text'] ?? '', '/start')) {
            return $this->handleStart($message);
        }

        return response()->json(['ok' => true]);
    }

    // ── /start ────────────────────────────────────────────────────────────

    private function handleStart(array $message): JsonResponse
    {
        $chatId = (string) ($message['chat']['id'] ?? '');
        $firstName = $message['from']['first_name'] ?? 'there';
        $username = $message['from']['username'] ?? null;

        if (! $username) {
            $this->sendMessage($chatId, "Hey {$firstName}!\n\nSet a Telegram @username in your profile settings, then tap /start again.");

            return response()->json(['ok' => true]);
        }

        Cache::forever("tg_user:{$username}", $chatId);
        $this->backfillChatId($username, $chatId);

        // Generate 8-char link code for onboarding wizard verification
        $code = strtoupper(substr(bin2hex(random_bytes(4)), 0, 8));
        Cache::put("tg_link_code:{$code}", $chatId, 600);
        Cache::put("tg_link_code_chat:{$chatId}", $code, 600);

        $this->sendMessage($chatId, implode("\n", [
            "Connected, {$firstName}!",
            '',
            "Your link code: <code>{$code}</code>",
            'Paste this code in the Mandate onboarding wizard to link your Telegram.',
            '',
            "I'll also send approval notifications here when your agent needs a decision.",
        ]));

        Log::info('Telegram user connected', ['username' => $username, 'chat_id' => $chatId]);

        return response()->json(['ok' => true]);
    }

    // ── Callback query (Approve / Reject buttons) ─────────────────────────

    private function handleCallback(array $callback): JsonResponse
    {
        $callbackId = $callback['id'] ?? '';
        $data = $callback['data'] ?? '';
        $chatId = (string) ($callback['message']['chat']['id'] ?? '');
        $messageId = $callback['message']['message_id'] ?? null;

        // Handle insight callbacks
        if (preg_match('/^(accept_insight|dismiss_insight):(.+)$/', $data, $im)) {
            return $this->handleInsightCallback($callbackId, $chatId, $messageId, $im[1], $im[2]);
        }

        // Expected format: "approve:{approvalId}" or "reject:{approvalId}"
        if (! preg_match('/^(approve|reject):(.+)$/', $data, $m)) {
            $this->answerCallback($callbackId, 'Unknown action');

            return response()->json(['ok' => true]);
        }

        $action = $m[1];
        $approvalId = $m[2];

        $approval = ApprovalQueue::with('intent', 'agent')->find($approvalId);

        if (! $approval) {
            $this->answerCallback($callbackId, 'Approval not found');

            return response()->json(['ok' => true]);
        }

        if ($approval->status !== ApprovalQueue::STATUS_PENDING) {
            $this->answerCallback($callbackId, 'Already decided: '.$approval->status);
            $this->editMessageButtons($chatId, $messageId, "Decision: {$approval->status}");

            return response()->json(['ok' => true]);
        }

        if ($approval->expires_at && $approval->expires_at->isPast()) {
            $this->answerCallback($callbackId, 'Expired');

            return response()->json(['ok' => true]);
        }

        // Decide
        $decision = $action === 'approve' ? 'approved' : 'rejected';
        $tgUser = $callback['from']['username'] ?? $callback['from']['first_name'] ?? 'telegram_user';

        $approval->update([
            'status' => $decision,
            'decided_by_user_id' => "tg:{$tgUser}",
            'decision_note' => "Decided via Telegram by @{$tgUser}",
            'decided_at' => now(),
        ]);

        $newStatus = $decision === 'approved'
            ? TxIntent::STATUS_APPROVED
            : TxIntent::STATUS_REJECTED;

        app(IntentStateMachineService::class)->transition(
            $approval->intent,
            $newStatus,
            "tg:{$tgUser}",
            'user',
            ['approval_id' => $approvalId, 'decision' => $decision, 'source' => 'telegram'],
        );

        RecordDecisionSignal::dispatch(
            $approval->intent->id,
            $decision,
            "Decided via Telegram by @{$tgUser}",
        );

        // Feedback
        $emoji = $decision === 'approved' ? '✅' : '❌';
        $label = $decision === 'approved' ? 'Approved' : 'Rejected';

        $this->answerCallback($callbackId, "{$emoji} {$label}");
        $this->editMessageButtons($chatId, $messageId, "{$emoji} {$label} by @{$tgUser}");

        Log::info('Telegram approval decision', [
            'approval_id' => $approvalId,
            'decision' => $decision,
            'by' => $tgUser,
        ]);

        return response()->json(['ok' => true]);
    }

    // ── Insight callbacks ──────────────────────────────────────────────────

    private function handleInsightCallback(string $callbackId, string $chatId, ?int $messageId, string $action, string $insightId): JsonResponse
    {
        $insight = PolicyInsight::find($insightId);

        if (! $insight) {
            $this->answerCallback($callbackId, 'Insight not found');

            return response()->json(['ok' => true]);
        }

        if ($insight->status !== PolicyInsight::STATUS_ACTIVE) {
            $this->answerCallback($callbackId, 'Already handled: '.$insight->status);
            $this->editMessageButtons($chatId, $messageId, "Status: {$insight->status}");

            return response()->json(['ok' => true]);
        }

        $service = app(PolicyInsightService::class);

        if ($action === 'accept_insight') {
            $service->applyInsight($insight);
            $emoji = '✅';
            $label = $insight->insight_type === PolicyInsight::TYPE_MANDATE_RULE
                ? 'Rule added to MANDATE.md'
                : 'Applied to policy';
        } else {
            $service->dismissInsight($insight);
            $emoji = '❌';
            $label = 'Dismissed';
        }

        $this->answerCallback($callbackId, "{$emoji} {$label}");
        $this->editMessageButtons($chatId, $messageId, "{$emoji} {$label}");

        Log::info('Telegram insight decision', [
            'insight_id' => $insightId,
            'action' => $action,
        ]);

        return response()->json(['ok' => true]);
    }

    // ── Telegram API helpers ──────────────────────────────────────────────

    private function sendMessage(string $chatId, string $text, array $buttons = []): void
    {
        $botToken = config('mandate.telegram.bot_token');
        if (! $botToken) {
            return;
        }

        $payload = [
            'chat_id' => $chatId,
            'text' => $text,
            'parse_mode' => 'HTML',
        ];

        if (! empty($buttons)) {
            $payload['reply_markup'] = ['inline_keyboard' => $buttons];
        }

        Http::post("https://api.telegram.org/bot{$botToken}/sendMessage", $payload);
    }

    private function answerCallback(string $callbackId, string $text = ''): void
    {
        $botToken = config('mandate.telegram.bot_token');
        if (! $botToken) {
            return;
        }

        Http::post("https://api.telegram.org/bot{$botToken}/answerCallbackQuery", [
            'callback_query_id' => $callbackId,
            'text' => $text,
        ]);
    }

    /**
     * Replace inline keyboard with a status line (removes buttons after decision).
     */
    private function editMessageButtons(string $chatId, ?int $messageId, string $statusText): void
    {
        if (! $messageId) {
            return;
        }

        $botToken = config('mandate.telegram.bot_token');
        if (! $botToken) {
            return;
        }

        Http::post("https://api.telegram.org/bot{$botToken}/editMessageReplyMarkup", [
            'chat_id' => $chatId,
            'message_id' => $messageId,
            'reply_markup' => ['inline_keyboard' => [
                [['text' => $statusText, 'url' => config('app.url', 'https://app.mandate.md').'/audit']],
            ]],
        ]);
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
}
