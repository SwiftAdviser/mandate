<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('agent_api_keys', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('agent_id')->constrained('agents')->cascadeOnDelete();
            $table->string('key_prefix', 16); // e.g. mndt_live_xxxx
            $table->string('key_hash');       // sha256 of full key
            $table->string('scope')->default('runtime'); // only 'runtime' scope
            $table->boolean('is_test')->default(false);
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();

            $table->unique('key_prefix');
            $table->index('agent_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agent_api_keys');
    }
};
