<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    // ─── GitHub OAuth ─────────────────────────────────────────────────

    public function test_github_redirect_returns_redirect_to_github(): void
    {
        $response = $this->get('/auth/github');

        $response->assertRedirect();
        $this->assertStringContainsString('github.com/login/oauth/authorize', $response->headers->get('Location'));
    }

    public function test_github_callback_creates_user_and_logs_in(): void
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

    public function test_github_callback_rejects_invalid_state(): void
    {
        $response = $this->withSession(['github_oauth_state' => 'correct-state'])
            ->get('/auth/github/callback?code=test-code&state=wrong-state');

        $response->assertRedirect('/login');
        $this->assertGuest();
    }

    public function test_github_callback_links_existing_email_user(): void
    {
        $existing = User::factory()->create([
            'email' => 'shared@example.com',
            'github_id' => null,
            'google_id' => null,
        ]);

        Http::fake([
            'github.com/login/oauth/access_token' => Http::response([
                'access_token' => 'gho_link_token',
            ]),
            'api.github.com/user' => Http::response([
                'id' => 99999,
                'login' => 'linkeduser',
                'name' => 'Linked User',
                'email' => 'shared@example.com',
                'avatar_url' => 'https://avatars.githubusercontent.com/u/99999',
            ]),
        ]);

        $response = $this->withSession(['github_oauth_state' => 'state'])
            ->get('/auth/github/callback?code=code&state=state');

        $response->assertRedirect('/dashboard');
        $this->assertEquals(99999, $existing->fresh()->github_id);
        $this->assertCount(1, User::where('email', 'shared@example.com')->get());
    }

    // ─── Google OAuth ─────────────────────────────────────────────────

    public function test_google_redirect_returns_redirect_to_google(): void
    {
        $response = $this->get('/auth/google');

        $response->assertRedirect();
        $this->assertStringContainsString('accounts.google.com/o/oauth2/v2/auth', $response->headers->get('Location'));
    }

    public function test_google_callback_creates_user_and_logs_in(): void
    {
        Http::fake([
            'oauth2.googleapis.com/token' => Http::response([
                'access_token' => 'ya29.test_token',
            ]),
            'www.googleapis.com/oauth2/v2/userinfo' => Http::response([
                'id' => '987654321',
                'name' => 'Google User',
                'email' => 'google@example.com',
                'picture' => 'https://lh3.googleusercontent.com/photo.jpg',
            ]),
        ]);

        $response = $this->withSession(['google_oauth_state' => 'gstate'])
            ->get('/auth/google/callback?code=gcode&state=gstate');

        $response->assertRedirect('/dashboard');

        $this->assertDatabaseHas('users', [
            'google_id' => 987654321,
            'name' => 'Google User',
            'email' => 'google@example.com',
        ]);

        $this->assertAuthenticated();
    }

    public function test_google_callback_rejects_invalid_state(): void
    {
        $response = $this->withSession(['google_oauth_state' => 'correct'])
            ->get('/auth/google/callback?code=code&state=wrong');

        $response->assertRedirect('/login');
        $this->assertGuest();
    }

    public function test_google_callback_links_existing_email_user(): void
    {
        $existing = User::factory()->create([
            'email' => 'multi@example.com',
            'github_id' => 11111,
            'google_id' => null,
        ]);

        Http::fake([
            'oauth2.googleapis.com/token' => Http::response([
                'access_token' => 'ya29.link_token',
            ]),
            'www.googleapis.com/oauth2/v2/userinfo' => Http::response([
                'id' => '55555',
                'name' => 'Multi User',
                'email' => 'multi@example.com',
                'picture' => null,
            ]),
        ]);

        $response = $this->withSession(['google_oauth_state' => 'st'])
            ->get('/auth/google/callback?code=c&state=st');

        $response->assertRedirect('/dashboard');
        $this->assertEquals(55555, $existing->fresh()->google_id);
        $this->assertEquals(11111, $existing->fresh()->github_id);
    }

    public function test_invalid_oauth_provider_returns_404(): void
    {
        $response = $this->get('/auth/twitter');
        $response->assertStatus(404);
    }

    // ─── Email/Password Registration ──────────────────────────────────

    public function test_register_page_renders(): void
    {
        $response = $this->get('/register');
        $response->assertStatus(200);
    }

    public function test_register_creates_user_and_sends_verification(): void
    {
        Notification::fake();

        $response = $this->post('/register', [
            'name' => 'New User',
            'email' => 'newuser@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $this->assertDatabaseHas('users', [
            'name' => 'New User',
            'email' => 'newuser@example.com',
        ]);

        $user = User::where('email', 'newuser@example.com')->first();
        $this->assertNull($user->email_verified_at);
        $this->assertAuthenticated();

        Notification::assertSentTo($user, VerifyEmail::class);
    }

    public function test_register_validates_required_fields(): void
    {
        $response = $this->post('/register', []);

        $response->assertSessionHasErrors(['name', 'email', 'password']);
    }

    public function test_register_validates_password_confirmation(): void
    {
        $response = $this->post('/register', [
            'name' => 'Test',
            'email' => 'test@example.com',
            'password' => 'password123',
            'password_confirmation' => 'different',
        ]);

        $response->assertSessionHasErrors('password');
    }

    public function test_register_rejects_duplicate_email_with_password(): void
    {
        User::factory()->create([
            'email' => 'taken@example.com',
            'password' => Hash::make('existing'),
        ]);

        $response = $this->post('/register', [
            'name' => 'Another',
            'email' => 'taken@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertSessionHasErrors('email');
    }

    public function test_register_links_to_existing_oauth_user(): void
    {
        Notification::fake();

        $existing = User::factory()->create([
            'email' => 'oauth@example.com',
            'password' => null,
            'github_id' => 12345,
        ]);

        $response = $this->post('/register', [
            'name' => 'OAuth User',
            'email' => 'oauth@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $this->assertCount(1, User::where('email', 'oauth@example.com')->get());
        $updated = $existing->fresh();
        $this->assertNotNull($updated->password);
        $this->assertEquals(12345, $updated->github_id);
    }

    // ─── Email/Password Login ─────────────────────────────────────────

    public function test_login_with_valid_credentials(): void
    {
        User::factory()->create([
            'email' => 'login@example.com',
            'password' => Hash::make('secret123'),
        ]);

        $response = $this->post('/login', [
            'email' => 'login@example.com',
            'password' => 'secret123',
        ]);

        $response->assertRedirect('/dashboard');
        $this->assertAuthenticated();
    }

    public function test_login_with_invalid_credentials(): void
    {
        User::factory()->create([
            'email' => 'login@example.com',
            'password' => Hash::make('secret123'),
        ]);

        $response = $this->post('/login', [
            'email' => 'login@example.com',
            'password' => 'wrong-password',
        ]);

        $response->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    // ─── Password Reset ───────────────────────────────────────────────

    public function test_forgot_password_sends_reset_link(): void
    {
        Notification::fake();

        $user = User::factory()->create(['email' => 'reset@example.com']);

        $response = $this->post('/forgot-password', ['email' => 'reset@example.com']);

        $response->assertSessionHas('success');
        Notification::assertSentTo($user, ResetPassword::class);
    }

    public function test_reset_password_with_valid_token(): void
    {
        $user = User::factory()->create(['email' => 'reset@example.com']);
        $token = Password::createToken($user);

        $response = $this->post('/reset-password', [
            'token' => $token,
            'email' => 'reset@example.com',
            'password' => 'new-password123',
            'password_confirmation' => 'new-password123',
        ]);

        $response->assertRedirect('/login');
        $this->assertTrue(Hash::check('new-password123', $user->fresh()->password));
    }

    // ─── Email Verification ───────────────────────────────────────────

    public function test_verification_notice_page_renders(): void
    {
        $user = User::factory()->unverified()->create();

        $response = $this->actingAs($user)->get('/email/verify');

        $response->assertStatus(200);
    }

    public function test_resend_verification_email(): void
    {
        Notification::fake();

        $user = User::factory()->unverified()->create();

        $response = $this->actingAs($user)->post('/email/verification-notification');

        $response->assertSessionHas('success');
        Notification::assertSentTo($user, VerifyEmail::class);
    }

    // ─── Logout ───────────────────────────────────────────────────────

    public function test_logout_clears_session(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/logout');

        $response->assertRedirect('/login');
        $this->assertGuest();
    }

    // ─── Protected Routes ─────────────────────────────────────────────

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
