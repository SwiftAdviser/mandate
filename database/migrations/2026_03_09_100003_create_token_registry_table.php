<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('token_registry', function (Blueprint $table) {
            $table->integer('chain_id');
            $table->string('address', 42);
            $table->string('symbol', 20);
            $table->integer('decimals');
            $table->boolean('is_stable')->default(false);
            $table->string('coingecko_id')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->primary(['chain_id', 'address']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('token_registry');
    }
};
