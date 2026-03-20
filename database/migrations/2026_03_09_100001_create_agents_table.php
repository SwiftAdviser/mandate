<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('agents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('org_id')->nullable(); // null until claimed
            $table->string('name');
            $table->string('evm_address', 42);
            $table->integer('chain_id');
            $table->string('claim_code', 12)->unique()->nullable();
            $table->timestamp('claimed_at')->nullable();
            $table->boolean('circuit_breaker_active')->default(false);
            $table->timestamp('circuit_breaker_tripped_at')->nullable();
            $table->string('circuit_breaker_reason')->nullable();
            $table->timestamps();

            $table->index('evm_address');
            $table->index('claim_code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agents');
    }
};
