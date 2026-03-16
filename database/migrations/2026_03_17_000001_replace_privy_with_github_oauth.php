<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->bigInteger('github_id')->unique()->nullable()->after('id');
            $table->string('avatar_url')->nullable()->after('email');
            $table->string('password')->nullable()->change();
            $table->string('email')->nullable()->change();
        });

        Schema::table('agents', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable()->after('id');
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            $table->dropColumn('org_id');
        });
    }

    public function down(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropColumn('user_id');
            $table->string('org_id')->nullable();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['github_id', 'avatar_url']);
            $table->string('password')->nullable(false)->change();
            $table->string('email')->nullable(false)->change();
        });
    }
};
