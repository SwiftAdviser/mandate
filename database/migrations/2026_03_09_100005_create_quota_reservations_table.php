<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quota_reservations', function (Blueprint $table) {
            $table->foreignUuid('agent_id')->constrained('agents')->cascadeOnDelete();
            $table->string('window_type', 10); // 'daily' | 'monthly'
            $table->string('window_key', 10);  // '2026-03-09' | '2026-03'
            $table->decimal('reserved_usd', 18, 6)->default(0);
            $table->decimal('confirmed_usd', 18, 6)->default(0);
            $table->timestamp('updated_at')->useCurrent();

            $table->primary(['agent_id', 'window_type', 'window_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quota_reservations');
    }
};
