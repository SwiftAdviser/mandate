<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('policies', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('agent_id')->constrained('agents')->cascadeOnDelete();
            $table->decimal('spend_limit_per_tx_usd', 18, 6)->nullable();
            $table->decimal('spend_limit_per_day_usd', 18, 6)->nullable();
            $table->decimal('spend_limit_per_month_usd', 18, 6)->nullable();
            $table->json('allowed_addresses')->nullable();    // whitelist of 'to' addresses
            $table->json('allowed_contracts')->nullable();   // contract addresses allowed
            $table->json('blocked_selectors')->nullable();   // 4-byte selectors blocked
            $table->json('require_approval_selectors')->nullable();
            $table->decimal('require_approval_above_usd', 18, 6)->nullable();
            $table->integer('max_slippage_bps')->nullable();
            $table->string('max_gas_limit')->nullable();
            $table->string('max_value_wei')->nullable(); // max native ETH value
            $table->json('schedule')->nullable();        // { days: [], hours: [] }
            $table->boolean('is_active')->default(true);
            $table->integer('version')->default(1);
            $table->timestamps();

            $table->index(['agent_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('policies');
    }
};
