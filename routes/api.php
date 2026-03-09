<?php

use App\Http\Controllers\Api\AgentRegistrationController;
use App\Http\Controllers\Api\ApprovalController;
use App\Http\Controllers\Api\CircuitBreakerController;
use App\Http\Controllers\Api\IntentController;
use App\Http\Controllers\Api\PolicyController;
use App\Http\Controllers\Api\ValidateController;
use App\Http\Middleware\PrivyAuth;
use App\Http\Middleware\RuntimeKeyAuth;
use Illuminate\Support\Facades\Route;

// ── Open (no auth) ──────────────────────────────────────────────────────────
Route::prefix('agents')->group(function () {
    Route::post('/register', [AgentRegistrationController::class, 'register']);
});

// ── Runtime key (agent → validate/events/status) ───────────────────────────
Route::middleware([RuntimeKeyAuth::class])->group(function () {
    Route::post('/validate', [ValidateController::class, 'validate']);

    Route::prefix('intents/{intentId}')->group(function () {
        Route::post('/events', [IntentController::class, 'postEvent']);
        Route::get('/status',  [IntentController::class, 'status']);
    });
});

// ── Admin (Privy JWT — dashboard only) ────────────────────────────────────
Route::middleware([PrivyAuth::class])->group(function () {
    // Claim agent
    Route::post('/agents/claim', [AgentRegistrationController::class, 'claim']);

    // Policy management
    Route::get('/agents/{agentId}/policies',       [PolicyController::class, 'index']);
    Route::post('/agents/{agentId}/policies',      [PolicyController::class, 'store']);
    Route::get('/agents/{agentId}/policies/{id}',  [PolicyController::class, 'show']);

    // Circuit breaker
    Route::post('/agents/{agentId}/circuit-break', [CircuitBreakerController::class, 'toggle']);
    Route::get('/agents/{agentId}/circuit-break',  [CircuitBreakerController::class, 'status']);

    // Approvals
    Route::get('/approvals',                   [ApprovalController::class, 'index']);
    Route::post('/approvals/{id}/decide',      [ApprovalController::class, 'decide']);

    // Cancel intent
    Route::post('/intents/{intentId}/cancel',  [IntentController::class, 'cancel']);
});
