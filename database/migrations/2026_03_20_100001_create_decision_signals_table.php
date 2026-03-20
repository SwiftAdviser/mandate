<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('decision_signals', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('agent_id')->constrained('agents')->cascadeOnDelete();
            $table->foreignUuid('intent_id')->constrained('tx_intents')->cascadeOnDelete();
            $table->string('signal_type', 20); // approved, rejected, blocked
            $table->string('to_address')->nullable();
            $table->string('decoded_action')->nullable();
            $table->decimal('amount_usd', 18, 6)->nullable();
            $table->integer('chain_id')->nullable();
            $table->text('reason')->nullable();
            $table->string('block_reason')->nullable();
            $table->string('day_of_week', 10)->nullable();
            $table->unsignedTinyInteger('hour_of_day')->nullable();
            $table->text('decision_note')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['agent_id', 'signal_type', 'to_address']);
            $table->index(['agent_id', 'signal_type', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('decision_signals');
    }
};
