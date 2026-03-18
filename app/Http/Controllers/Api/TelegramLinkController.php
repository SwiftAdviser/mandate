<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramLinkController extends Controller
{
    public function verifyCode(Request $request): JsonResponse
    {
        $request->validate([
            'code' => 'required|string|size:8',
            'agent_id' => 'required|string',
        ]);

        $code = strtoupper($request->input('code'));
        $agentId = $request->input('agent_id');

        $chatId = Cache::get("tg_link_code:{$code}");

        if (! $chatId) {
            return response()->json(['error' => 'Invalid or expired code.'], 422);
        }

        $agent = Agent::where('id', $agentId)
            ->where('user_id', auth()->id())
            ->first();

        if (! $agent) {
            return response()->json(['error' => 'Agent not found.'], 404);
        }

        // Add telegram webhook with chat_id to agent
        $webhooks = $agent->notification_webhooks ?? [];
        $webhooks[] = [
            'type' => 'telegram',
            'chat_id' => $chatId,
        ];
        $agent->update(['notification_webhooks' => $webhooks]);

        // Consume the code
        Cache::forget("tg_link_code:{$code}");
        Cache::forget("tg_link_code_chat:{$chatId}");

        // Send confirmation to Telegram
        $botToken = config('mandate.telegram.bot_token');
        if ($botToken) {
            Http::post("https://api.telegram.org/bot{$botToken}/sendMessage", [
                'chat_id' => $chatId,
                'text' => "Linked to agent <b>{$agent->name}</b>. You'll receive approval requests here.",
                'parse_mode' => 'HTML',
            ]);
        }

        Log::info('Telegram linked via code', ['agent_id' => $agentId, 'chat_id' => $chatId]);

        return response()->json(['linked' => true]);
    }
}
