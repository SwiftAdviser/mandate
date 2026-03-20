<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tx_intents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('agent_id')->constrained('agents')->cascadeOnDelete();
            $table->foreignUuid('policy_id')->constrained('policies');
            $table->string('intent_hash', 66); // keccak256 hex
            $table->integer('chain_id');
            $table->bigInteger('nonce');
            $table->string('to_address', 42);
            $table->text('calldata');
            $table->string('value_wei', 78)->default('0');
            $table->string('gas_limit', 20);
            $table->string('max_fee_per_gas', 20);
            $table->string('max_priority_fee_per_gas', 20);
            $table->smallInteger('tx_type')->default(2);
            $table->json('access_list')->default('[]');
            // Decoded intent
            $table->string('decoded_action')->nullable();    // 'transfer' | 'approve' | 'swap' | 'unknown'
            $table->string('decoded_token', 42)->nullable();
            $table->string('decoded_recipient', 42)->nullable();
            $table->string('decoded_raw_amount', 78)->nullable();
            $table->decimal('amount_usd_computed', 18, 6)->nullable();
            // State
            $table->string('status', 20); // reserved|approval_pending|approved|broadcasted|confirmed|failed|expired
            $table->string('block_reason')->nullable();
            $table->string('tx_hash', 66)->nullable();
            $table->string('gas_used', 20)->nullable();
            $table->string('block_number', 20)->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->unique(['agent_id', 'intent_hash']);
            $table->index(['agent_id', 'status']);
            $table->index(['status', 'expires_at']);
            $table->index('tx_hash');
        });

        // Partial unique index: only one active (non-terminal) intent per nonce per agent
        DB::statement("
            CREATE UNIQUE INDEX tx_intents_agent_nonce_active_unique
            ON tx_intents (agent_id, chain_id, nonce)
            WHERE status IN ('reserved', 'approval_pending', 'approved', 'broadcasted')
        ");
    }

    public function down(): void
    {
        Schema::dropIfExists('tx_intents');
    }
};
