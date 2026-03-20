<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tx_intents', function (Blueprint $table) {
            $table->bigInteger('nonce')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('tx_intents', function (Blueprint $table) {
            $table->bigInteger('nonce')->nullable(false)->default(0)->change();
        });
    }
};
