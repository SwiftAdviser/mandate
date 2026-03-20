<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_github_redirect_returns_redirect_to_github(): void
    {
        $response = $this->get('/auth/github');

        $response->assertRedirect();
        $this->assertStringContainsString('github.com/login/oauth/authorize', $response->headers->get('Location'));
    }

    public function test_callback_creates_user_and_logs_in(): void
    {
        Http::fake([
            'github.com/login/oauth/access_token' => Http::response([
                'access_token' => 'gho_test_token_123',
            ]),
            'api.github.com/user' => Http::response([
                'id' => 12345678,
                'login' => 'testdev',
                'name' => 'Test Developer',
                'email' => 'test@example.com',
                'avatar_url' => 'https://avatars.githubusercontent.com/u/12345678',
            ]),
        ]);

        // Set state in session
        $response = $this->withSession(['github_oauth_state' => 'test-state'])
            ->get('/auth/github/callback?code=test-code&state=test-state');

        $response->assertRedirect('/dashboard');

        $this->assertDatabaseHas('users', [
            'github_id' => 12345678,
            'name' => 'Test Developer',
            'email' => 'test@example.com',
        ]);

        $this->assertAuthenticated();
    }

    public function test_callback_rejects_invalid_state(): void
    {
        $response = $this->withSession(['github_oauth_state' => 'correct-state'])
            ->get('/auth/github/callback?code=test-code&state=wrong-state');

        $response->assertRedirect('/login');
        $this->assertGuest();
    }

    public function test_logout_clears_session(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/logout');

        $response->assertRedirect('/login');
        $this->assertGuest();
    }

    public function test_protected_routes_redirect_unauthenticated_to_login(): void
    {
        $routes = ['/dashboard', '/audit', '/approvals', '/policies', '/agents'];

        foreach ($routes as $route) {
            $response = $this->get($route);
            $response->assertRedirect('/login');
        }
    }

    public function test_admin_api_returns_401_when_unauthenticated(): void
    {
        $response = $this->postJson('/api/agents/claim', ['claimCode' => 'TESTCODE']);

        $response->assertStatus(401);
    }
}
