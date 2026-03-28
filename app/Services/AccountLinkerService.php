<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AccountLinkerService
{
    public function findOrCreateOAuth(
        string $provider,
        int|string $providerId,
        string $name,
        ?string $email,
        ?string $avatarUrl,
    ): User {
        $providerColumn = "{$provider}_id";

        // 1. Match by provider ID
        $user = User::where($providerColumn, $providerId)->first();
        if ($user) {
            $user->update([
                'name' => $name,
                'email' => $email ?? $user->email,
                'avatar_url' => $avatarUrl ?? $user->avatar_url,
            ]);

            return $user;
        }

        // 2. Match by email (link accounts)
        if ($email) {
            $user = User::where('email', $email)->first();
            if ($user) {
                $user->update([
                    $providerColumn => $providerId,
                    'avatar_url' => $user->avatar_url ?? $avatarUrl,
                ]);

                return $user;
            }
        }

        // 3. Create new user (OAuth emails are trusted)
        $user = User::create([
            'name' => $name,
            'email' => $email,
            $providerColumn => $providerId,
            'avatar_url' => $avatarUrl,
        ]);
        $user->forceFill(['email_verified_at' => now()])->save();

        return $user;
    }

    public function registerWithEmail(string $name, string $email, string $password): User
    {
        $existing = User::where('email', $email)->first();

        if ($existing && $existing->password) {
            throw ValidationException::withMessages([
                'email' => ['An account with this email already exists.'],
            ]);
        }

        if ($existing) {
            // OAuth-only user, set password
            $existing->update([
                'password' => Hash::make($password),
            ]);

            return $existing;
        }

        return User::create([
            'name' => $name,
            'email' => $email,
            'password' => Hash::make($password),
        ]);
    }
}
