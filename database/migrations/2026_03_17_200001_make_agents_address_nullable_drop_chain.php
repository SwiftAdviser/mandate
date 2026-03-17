<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            $table->string('evm_address', 42)->nullable()->change();
            $table->integer('chain_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            $table->string('evm_address', 42)->nullable(false)->change();
            $table->integer('chain_id')->nullable(false)->change();
        });
    }
};
