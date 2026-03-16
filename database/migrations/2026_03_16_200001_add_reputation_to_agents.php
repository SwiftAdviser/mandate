<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            $table->string('eip8004_agent_id')->nullable();
            $table->float('reputation_score')->nullable();
            $table->timestamp('reputation_checked_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            $table->dropColumn(['eip8004_agent_id', 'reputation_score', 'reputation_checked_at']);
        });
    }
};
