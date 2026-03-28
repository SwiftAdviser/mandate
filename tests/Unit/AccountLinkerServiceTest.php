<?php

namespace Tests\Unit;

use App\Models\User;
use App\Services\AccountLinkerService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class AccountLinkerServiceTest extends TestCase
{
    use RefreshDatabase;

    private AccountLinkerService $linker;

    protected function setUp(): void
    {
        parent::setUp();
        $this->linker = new AccountLinkerService;
    }

    public function test_creates_new_user_for_unknown_oauth(): void
    {
        $user = $this->linker->findOrCreateOAuth(
            provider: 'github',
            providerId: 12345,
            name: 'Test User',
            email: 'test@example.com',
            avatarUrl: 'https://example.com/avatar.png',
        );

        $this->assertDatabaseHas('users', [
            'github_id' => 12345,
            'name' => 'Test User',
            'email' => 'test@example.com',
            'avatar_url' => 'https://example.com/avatar.png',
        ]);
        $this->assertNotNull($user->email_verified_at);
    }

    public function test_creates_new_user_for_google_oauth(): void
    {
        $user = $this->linker->findOrCreateOAuth(
            provider: 'google',
            providerId: 99999,
            name: 'Google User',
            email: 'google@example.com',
            avatarUrl: 'https://lh3.google.com/photo.jpg',
        );

        $this->assertDatabaseHas('users', [
            'google_id' => 99999,
            'name' => 'Google User',
            'email' => 'google@example.com',
        ]);
        $this->assertNotNull($user->email_verified_at);
    }

    public function test_updates_existing_user_by_provider_id(): void
    {
        $existing = User::factory()->create([
            'github_id' => 12345,
            'name' => 'Old Name',
            'email' => 'old@example.com',
        ]);

        $user = $this->linker->findOrCreateOAuth(
            provider: 'github',
            providerId: 12345,
            name: 'New Name',
            email: 'new@example.com',
            avatarUrl: 'https://example.com/new-avatar.png',
        );

        $this->assertEquals($existing->id, $user->id);
        $this->assertEquals('New Name', $user->fresh()->name);
        $this->assertEquals('new@example.com', $user->fresh()->email);
    }

    public function test_links_oauth_to_existing_email_user(): void
    {
        $existing = User::factory()->create([
            'email' => 'shared@example.com',
            'github_id' => null,
            'google_id' => null,
        ]);

        $user = $this->linker->findOrCreateOAuth(
            provider: 'google',
            providerId: 55555,
            name: 'Google Name',
            email: 'shared@example.com',
            avatarUrl: 'https://lh3.google.com/photo.jpg',
        );

        $this->assertEquals($existing->id, $user->id);
        $this->assertEquals(55555, $user->fresh()->google_id);
    }

    public function test_links_github_to_existing_google_user(): void
    {
        $existing = User::factory()->create([
            'email' => 'multi@example.com',
            'github_id' => null,
            'google_id' => 77777,
        ]);

        $user = $this->linker->findOrCreateOAuth(
            provider: 'github',
            providerId: 88888,
            name: 'GitHub Name',
            email: 'multi@example.com',
            avatarUrl: null,
        );

        $this->assertEquals($existing->id, $user->id);
        $this->assertEquals(88888, $user->fresh()->github_id);
        $this->assertEquals(77777, $user->fresh()->google_id);
    }

    public function test_register_email_creates_new_user(): void
    {
        $user = $this->linker->registerWithEmail(
            name: 'Email User',
            email: 'email@example.com',
            password: 'secret123',
        );

        $this->assertDatabaseHas('users', [
            'name' => 'Email User',
            'email' => 'email@example.com',
        ]);
        $this->assertNull($user->email_verified_at);
        $this->assertNotNull($user->password);
    }

    public function test_register_email_rejects_duplicate_with_password(): void
    {
        User::factory()->create([
            'email' => 'taken@example.com',
            'password' => 'existing-password',
        ]);

        $this->expectException(ValidationException::class);

        $this->linker->registerWithEmail(
            name: 'Another User',
            email: 'taken@example.com',
            password: 'new-password',
        );
    }

    public function test_register_email_sets_password_on_oauth_only_user(): void
    {
        $existing = User::factory()->create([
            'email' => 'oauth@example.com',
            'password' => null,
            'github_id' => 12345,
        ]);

        $user = $this->linker->registerWithEmail(
            name: 'Updated Name',
            email: 'oauth@example.com',
            password: 'new-password',
        );

        $this->assertEquals($existing->id, $user->id);
        $this->assertNotNull($user->fresh()->password);
        $this->assertEquals(12345, $user->fresh()->github_id);
    }
}
