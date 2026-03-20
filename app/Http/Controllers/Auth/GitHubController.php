<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class GitHubController extends Controller
{
    public function redirect(Request $request): RedirectResponse
    {
        $state = Str::random(40);
        $request->session()->put('github_oauth_state', $state);

        $query = http_build_query([
            'client_id' => config('services.github.client_id'),
            'redirect_uri' => url(config('services.github.redirect')),
            'scope' => 'read:user user:email',
            'state' => $state,
        ]);

        return redirect("https://github.com/login/oauth/authorize?{$query}");
    }

    public function callback(Request $request): RedirectResponse
    {
        if ($request->state !== $request->session()->pull('github_oauth_state')) {
            return redirect('/login')->with('error', 'Invalid OAuth state.');
        }

        $tokenResponse = Http::acceptJson()->post('https://github.com/login/oauth/access_token', [
            'client_id' => config('services.github.client_id'),
            'client_secret' => config('services.github.client_secret'),
            'code' => $request->code,
            'redirect_uri' => url(config('services.github.redirect')),
        ]);

        $accessToken = $tokenResponse->json('access_token');

        if (! $accessToken) {
            return redirect('/login')->with('error', 'GitHub authentication failed.');
        }

        $githubUser = Http::withToken($accessToken)->get('https://api.github.com/user')->json();

        $user = User::updateOrCreate(
            ['github_id' => $githubUser['id']],
            [
                'name' => $githubUser['name'] ?? $githubUser['login'],
                'email' => $githubUser['email'],
                'avatar_url' => $githubUser['avatar_url'] ?? null,
            ]
        );

        Auth::login($user, remember: true);

        $intended = $request->session()->pull('url.intended', '/dashboard');

        return redirect($intended);
    }

    public function logout(Request $request): RedirectResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/login');
    }
}
