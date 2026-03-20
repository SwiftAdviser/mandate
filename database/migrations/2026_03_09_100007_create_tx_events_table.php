<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tx_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('intent_id')->constrained('tx_intents')->cascadeOnDelete();
            $table->foreignUuid('agent_id')->constrained('agents')->cascadeOnDelete();
            $table->string('event_type', 50); // validated|broadcasted|confirmed|failed|expired|security_violation|etc
            $table->string('actor_id', 100);  // agent uuid | user privy DID | 'system'
            $table->string('actor_role', 20); // 'agent' | 'user' | 'system'
            $table->jsonb('metadata')->default('{}');
            $table->timestamp('created_at')->useCurrent();

            // Append-only: no updated_at
            $table->index(['intent_id', 'created_at']);
            $table->index(['agent_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tx_events');
    }
};
