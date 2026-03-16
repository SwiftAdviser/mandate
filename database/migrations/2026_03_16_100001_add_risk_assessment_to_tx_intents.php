<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tx_intents', function (Blueprint $table) {
            $table->string('risk_level', 10)->nullable()->after('amount_usd_computed');
            $table->json('risk_assessment')->nullable()->after('risk_level');
            $table->boolean('risk_degraded')->default(false)->after('risk_assessment');
            $table->index('risk_level');
        });

        Schema::table('policies', function (Blueprint $table) {
            $table->boolean('risk_scan_enabled')->default(true)->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('tx_intents', function (Blueprint $table) {
            $table->dropIndex(['risk_level']);
            $table->dropColumn(['risk_level', 'risk_assessment', 'risk_degraded']);
        });

        Schema::table('policies', function (Blueprint $table) {
            $table->dropColumn('risk_scan_enabled');
        });
    }
};
