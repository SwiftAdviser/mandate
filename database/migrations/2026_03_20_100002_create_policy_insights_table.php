<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('policy_insights', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('agent_id')->constrained('agents')->cascadeOnDelete();
            $table->string('insight_type', 40); // add_to_allowlist, raise_approval_threshold, add_to_allowed_contracts, add_schedule_restriction, mandate_rule
            $table->string('target_section', 20)->nullable(); // block, require_approval, allow (for mandate_rule)
            $table->string('status', 20)->default('active'); // active, accepted, dismissed, expired
            $table->float('confidence')->default(0.0);
            $table->unsignedInteger('evidence_count')->default(0);
            $table->json('evidence')->nullable();
            $table->json('suggestion')->nullable();
            $table->string('title');
            $table->text('description')->nullable();
            $table->foreignUuid('policy_id')->nullable()->constrained('policies')->nullOnDelete();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('dismissed_at')->nullable();
            $table->timestamps();

            $table->index(['agent_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('policy_insights');
    }
};
