<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('skill_heartbeats', function (Blueprint $table) {
            $table->id();
            $table->uuid('agent_id')->nullable();
            $table->string('ip', 45);
            $table->string('user_agent', 512)->nullable();
            $table->string('skill_version', 20);
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('agent_id')->references('id')->on('agents')->nullOnDelete();
            $table->index('created_at');
            $table->index(['agent_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('skill_heartbeats');
    }
};
