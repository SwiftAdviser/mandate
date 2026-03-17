<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tx_intents', function (Blueprint $table) {
            $table->text('reason')->nullable()->after('amount_usd_computed');
        });
    }

    public function down(): void
    {
        Schema::table('tx_intents', function (Blueprint $table) {
            $table->dropColumn('reason');
        });
    }
};
