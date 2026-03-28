<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\AccountLinkerService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class SocialAuthController extends Controller
{
    private const PROVIDERS = [
        'github' => [
            'authorize_url' => 'https://github.com/login/oauth/authorize',
            'token_url' => 'https://github.com/login/oauth/access_token',
            'userinfo_url' => 'https://api.github.com/user',
            'scope' => 'read:user user:email',
        ],
        'google' => [
            'authorize_url' => 'https://accounts.google.com/o/oauth2/v2/auth',
            'token_url' => 'https://oauth2.googleapis.com/token',
            'userinfo_url' => 'https://www.googleapis.com/oauth2/v2/userinfo',
            'scope' => 'openid email profile',
        ],
    ];

    public function __construct(private AccountLinkerService $linker) {}

    public function redirect(Request $request, string $provider): RedirectResponse
    {
        $config = self::PROVIDERS[$provider];
        $state = Str::random(40);
        $request->session()->put("{$provider}_oauth_state", $state);

        $params = [
            'client_id' => config("services.{$provider}.client_id"),
            'redirect_uri' => url(config("services.{$provider}.redirect")),
            'scope' => $config['scope'],
            'state' => $state,
        ];

        if ($provider === 'google') {
            $params['response_type'] = 'code';
            $params['access_type'] = 'offline';
            $params['prompt'] = 'select_account';
        }

        $query = http_build_query($params);

        return redirect("{$config['authorize_url']}?{$query}");
    }

    public function callback(Request $request, string $provider): RedirectResponse
    {
        $config = self::PROVIDERS[$provider];

        if ($request->state !== $request->session()->pull("{$provider}_oauth_state")) {
            return redirect('/login')->with('error', 'Invalid OAuth state.');
        }

        // Exchange code for token
        $tokenParams = [
            'client_id' => config("services.{$provider}.client_id"),
            'client_secret' => config("services.{$provider}.client_secret"),
            'code' => $request->code,
            'redirect_uri' => url(config("services.{$provider}.redirect")),
        ];

        if ($provider === 'google') {
            $tokenParams['grant_type'] = 'authorization_code';
            $tokenResponse = Http::asForm()->post($config['token_url'], $tokenParams);
        } else {
            $tokenResponse = Http::acceptJson()->post($config['token_url'], $tokenParams);
        }

        $accessToken = $tokenResponse->json('access_token');
        if (! $accessToken) {
            return redirect('/login')->with('error', ucfirst($provider).' authentication failed.');
        }

        // Fetch user info
        $socialUser = Http::withToken($accessToken)->get($config['userinfo_url'])->json();

        // Extract user data (provider-specific field names)
        $userData = $this->extractUserData($provider, $socialUser);

        $user = $this->linker->findOrCreateOAuth(
            provider: $provider,
            providerId: $userData['id'],
            name: $userData['name'],
            email: $userData['email'],
            avatarUrl: $userData['avatar'],
        );

        Auth::login($user, remember: true);

        return redirect($request->session()->pull('url.intended', '/dashboard'));
    }

    private function extractUserData(string $provider, array $data): array
    {
        return match ($provider) {
            'github' => [
                'id' => $data['id'],
                'name' => $data['name'] ?? $data['login'],
                'email' => $data['email'] ?? null,
                'avatar' => $data['avatar_url'] ?? null,
            ],
            'google' => [
                'id' => $data['id'],
                'name' => $data['name'] ?? $data['email'],
                'email' => $data['email'] ?? null,
                'avatar' => $data['picture'] ?? null,
            ],
        };
    }
}
