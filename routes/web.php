<?php

use App\Http\Controllers\Auth\GitHubController;
use App\Http\Controllers\Web\DashboardController;
use Illuminate\Support\Facades\Route;

// Landing — public
Route::get('/', function () {
    if (auth()->check()) {
        return redirect('/dashboard');
    }

    return \Inertia\Inertia::render('Landing');
});

// Local dev: auto-login
if (app()->environment('local')) {
    Route::get('/dev-login', function () {
        \Illuminate\Support\Facades\Auth::loginUsingId(\App\Models\User::first()->id);

        return redirect('/dashboard');
    });
}

// Auth
Route::get('/login', function (\Illuminate\Http\Request $request) {
    if ($redirect = $request->query('redirect')) {
        $request->session()->put('url.intended', $redirect);
    }

    return \Inertia\Inertia::render('Login');
})->middleware('guest')->name('login');
Route::get('/auth/github', [GitHubController::class, 'redirect'])->middleware('guest');
Route::get('/auth/github/callback', [GitHubController::class, 'callback'])->middleware('guest');
Route::post('/logout', [GitHubController::class, 'logout'])->middleware('auth');

// Claim page — public (user has claimUrl, may not be logged in yet)
Route::get('/claim', [DashboardController::class, 'claim']);

// Dashboard — requires session auth
Route::middleware(['auth'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'dashboard']);
    Route::get('/audit', [DashboardController::class, 'audit']);
    Route::get('/approvals', [DashboardController::class, 'approvals']);
    Route::get('/policies', [DashboardController::class, 'policies']);
    Route::get('/mandate', [DashboardController::class, 'mandate']);
    Route::get('/notifications', [DashboardController::class, 'notifications']);
    Route::get('/insights', [DashboardController::class, 'insights']);
    Route::get('/agents', [DashboardController::class, 'agents']);
    Route::get('/how-it-works', fn () => \Inertia\Inertia::render('HowItWorks'));
    Route::get('/integrations', function (\Illuminate\Http\Request $request) {
        $runtimeKey = $request->session()->get('first_agent_key');

        return \Inertia\Inertia::render('Integrations', [
            'runtime_key' => $runtimeKey,
        ]);
    });
});
