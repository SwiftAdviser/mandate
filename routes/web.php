<?php

use App\Http\Controllers\Auth\GitHubController;
use App\Http\Controllers\Web\DashboardController;
use Illuminate\Support\Facades\Route;

// Landing — public
Route::get('/', fn () => \Inertia\Inertia::render('Landing'));

// Integrations — public
Route::get('/integrations', fn () => \Inertia\Inertia::render('Integrations'));

// Auth
Route::get('/login', fn () => \Inertia\Inertia::render('Login'))->middleware('guest')->name('login');
Route::get('/auth/github', [GitHubController::class, 'redirect'])->middleware('guest');
Route::get('/auth/github/callback', [GitHubController::class, 'callback'])->middleware('guest');
Route::post('/logout', [GitHubController::class, 'logout'])->middleware('auth');

// Claim page — public (user has claimUrl, may not be logged in yet)
Route::get('/claim', [DashboardController::class, 'claim']);

// Dashboard — requires session auth
Route::middleware(['auth'])->group(function () {
    Route::get('/dashboard',  [DashboardController::class, 'dashboard']);
    Route::get('/audit',      [DashboardController::class, 'audit']);
    Route::get('/approvals',  [DashboardController::class, 'approvals']);
    Route::get('/policies',   [DashboardController::class, 'policies']);
    Route::get('/mandate',       [DashboardController::class, 'mandate']);
    Route::get('/notifications', [DashboardController::class, 'notifications']);
    Route::get('/agents',     [DashboardController::class, 'dashboard']); // alias for now
});


