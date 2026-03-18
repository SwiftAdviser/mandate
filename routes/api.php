<?php

use App\Http\Controllers\Api\ActivateController;
use App\Http\Controllers\Api\AgentRegistrationController;
use App\Http\Controllers\Api\AgentWebhookController;
use App\Http\Controllers\Api\ApprovalController;
use App\Http\Controllers\Api\CircuitBreakerController;
use App\Http\Controllers\Api\DemoIntentController;
use App\Http\Controllers\Api\IntentController;
use App\Http\Controllers\Api\TelegramLinkController;
use App\Http\Controllers\Api\PolicyController;
use App\Http\Controllers\Api\RiskCheckController;
use App\Http\Controllers\Api\TelegramWebhookController;
use App\Http\Controllers\Api\ValidateController;
use App\Http\Middleware\RuntimeKeyAuth;
use Illuminate\Support\Facades\Route;

// ── Open (no auth) ──────────────────────────────────────────────────────────
Route::prefix('agents')->group(function () {
    Route::post('/register', [AgentRegistrationController::class, 'register']);
});

// Telegram bot webhook (public, verified by secret in path)
Route::post('/telegram/webhook/{secret}', TelegramWebhookController::class);

// ── Runtime key (agent → validate/events/status) ───────────────────────────
Route::middleware([RuntimeKeyAuth::class])->group(function () {
    Route::post('/activate', [ActivateController::class, 'activate']);
    Route::post('/validate', [ValidateController::class, 'validate']);
    Route::post('/validate/preflight', [ValidateController::class, 'preflight']);

    Route::prefix('intents/{intentId}')->group(function () {
        Route::post('/events', [IntentController::class, 'postEvent']);
        Route::get('/status', [IntentController::class, 'status']);
    });

    Route::post('/risk/check', [RiskCheckController::class, 'check']);
});

// ── Admin (session auth via Sanctum SPA) ────────────────────────────────────
Route::middleware(['auth:sanctum'])->group(function () {
    // Claim agent
    Route::post('/agents/claim', [AgentRegistrationController::class, 'claim']);

    // Dashboard-first agent creation + deletion
    Route::post('/agents/create', [AgentRegistrationController::class, 'create']);
    Route::delete('/agents/{agentId}', [AgentRegistrationController::class, 'destroy']);
    Route::post('/agents/{agentId}/regenerate-key', [AgentRegistrationController::class, 'regenerateKey']);

    // Policy management
    Route::get('/agents/{agentId}/policies', [PolicyController::class, 'index']);
    Route::post('/agents/{agentId}/policies', [PolicyController::class, 'store']);
    Route::get('/agents/{agentId}/policies/{id}', [PolicyController::class, 'show']);

    // Circuit breaker
    Route::post('/agents/{agentId}/circuit-break', [CircuitBreakerController::class, 'toggle']);
    Route::get('/agents/{agentId}/circuit-break', [CircuitBreakerController::class, 'status']);

    // Approvals
    Route::get('/approvals', [ApprovalController::class, 'index']);
    Route::post('/approvals/{id}/decide', [ApprovalController::class, 'decide']);

    // Cancel intent
    Route::post('/intents/{intentId}/cancel', [IntentController::class, 'cancel']);

    // Agent webhooks
    Route::get('/agents/{agentId}/webhooks', [AgentWebhookController::class, 'index']);
    Route::put('/agents/{agentId}/webhooks', [AgentWebhookController::class, 'update']);
    Route::post('/agents/{agentId}/webhooks/test', [AgentWebhookController::class, 'test']);

    // Demo intent (onboarding)
    Route::post('/agents/{agentId}/demo-intent', [DemoIntentController::class, 'store']);

    // Telegram link via code (onboarding)
    Route::post('/telegram/verify-code', [TelegramLinkController::class, 'verifyCode']);

});
