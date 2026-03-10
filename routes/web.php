<?php

use App\Http\Controllers\Web\DashboardController;
use App\Http\Middleware\PrivyAuth;
use Illuminate\Support\Facades\Route;

// Landing — public
Route::get('/', fn () => \Inertia\Inertia::render('Landing'));

// Integrations — public
Route::get('/integrations', fn () => \Inertia\Inertia::render('Integrations'));

// Login — public
Route::get('/login', fn () => \Inertia\Inertia::render('Login'));

// Claim page — open (user has claimUrl, no Privy login yet)
Route::get('/claim', [DashboardController::class, 'claim']);

// Dashboard — requires Privy session (cookie-based)
Route::middleware([PrivyAuth::class])->group(function () {
    Route::get('/dashboard',  [DashboardController::class, 'dashboard']);
    Route::get('/audit',      [DashboardController::class, 'audit']);
    Route::get('/approvals',  [DashboardController::class, 'approvals']);
    Route::get('/policies',   [DashboardController::class, 'policies']);
    Route::get('/agents',     [DashboardController::class, 'dashboard']); // alias for now
});
