<?php

use App\Http\Controllers\Api\SkillController;
use App\Http\Controllers\Auth\EmailVerificationController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\LogoutController;
use App\Http\Controllers\Auth\PasswordResetController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\Auth\SocialAuthController;
use App\Http\Controllers\Web\DashboardController;
use Illuminate\Support\Facades\Route;

// SKILL.md — public, no CSRF (agents fetch this as an API call)
Route::get('/skill.md', [SkillController::class, 'show'])
    ->withoutMiddleware(\Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class)
    ->middleware('throttle:60,1');

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

// Auth — guest routes
Route::middleware('guest')->group(function () {
    Route::get('/login', function (\Illuminate\Http\Request $request) {
        if ($redirect = $request->query('redirect')) {
            $request->session()->put('url.intended', $redirect);
        }

        return \Inertia\Inertia::render('Login');
    })->name('login');

    // Email/password
    Route::get('/register', fn () => \Inertia\Inertia::render('Register'))->name('register');
    Route::post('/register', [RegisterController::class, 'store']);
    Route::post('/login', [LoginController::class, 'store']);

    // OAuth (GitHub + Google)
    Route::get('/auth/{provider}', [SocialAuthController::class, 'redirect'])
        ->whereIn('provider', ['github', 'google']);
    Route::get('/auth/{provider}/callback', [SocialAuthController::class, 'callback'])
        ->whereIn('provider', ['github', 'google']);

    // Password reset
    Route::get('/forgot-password', fn () => \Inertia\Inertia::render('ForgotPassword'))->name('password.request');
    Route::post('/forgot-password', [PasswordResetController::class, 'sendLink'])->name('password.email');
    Route::get('/reset-password/{token}', fn (\Illuminate\Http\Request $request, string $token) => \Inertia\Inertia::render('ResetPassword', [
        'token' => $token, 'email' => $request->query('email'),
    ]))->name('password.reset');
    Route::post('/reset-password', [PasswordResetController::class, 'reset'])->name('password.update');
});

// Auth — authenticated routes
Route::post('/logout', LogoutController::class)->middleware('auth');

// Email verification
Route::middleware('auth')->group(function () {
    Route::get('/email/verify', fn () => \Inertia\Inertia::render('VerifyEmail'))->name('verification.notice');
    Route::get('/email/verify/{id}/{hash}', [EmailVerificationController::class, 'verify'])
        ->middleware('signed')->name('verification.verify');
    Route::post('/email/verification-notification', [EmailVerificationController::class, 'resend'])
        ->middleware('throttle:6,1')->name('verification.send');
});

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
    Route::get('/heartbeats', [DashboardController::class, 'heartbeats']);
    Route::get('/how-it-works', fn () => \Inertia\Inertia::render('HowItWorks'));
    Route::get('/integrations', function (\Illuminate\Http\Request $request) {
        $runtimeKey = $request->session()->get('first_agent_key');

        return \Inertia\Inertia::render('Integrations', [
            'runtime_key' => $runtimeKey,
        ]);
    });
});
