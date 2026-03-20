<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('approval_queues', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('intent_id')->constrained('tx_intents')->cascadeOnDelete();
            $table->foreignUuid('agent_id')->constrained('agents')->cascadeOnDelete();
            $table->string('status', 20)->default('pending'); // pending|approved|rejected|expired
            $table->string('decided_by_user_id', 100)->nullable(); // Privy DID
            $table->text('decision_note')->nullable();
            $table->timestamp('decided_at')->nullable();
            $table->timestamp('expires_at');
            $table->timestamps();

            $table->unique('intent_id');
            $table->index(['status', 'expires_at']);
            $table->index(['agent_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('approval_queues');
    }
};
