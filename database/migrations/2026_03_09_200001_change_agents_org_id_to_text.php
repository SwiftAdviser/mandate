<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// org_id was defined as foreignUuid but Privy DIDs are "did:privy:xxx" strings — not UUIDs.
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE agents ALTER COLUMN org_id TYPE text USING org_id::text');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE agents ALTER COLUMN org_id TYPE uuid USING org_id::uuid');
    }
};
