<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Rename evm_address -> wallet_address
        Schema::table('agents', function (Blueprint $table) {
            $table->renameColumn('evm_address', 'wallet_address');
        });

        // Widen columns with raw ALTER TABLE (Laravel change() unreliable for varchar resize on PG)
        DB::statement('ALTER TABLE agents ALTER COLUMN wallet_address TYPE varchar(128)');
        DB::statement('ALTER TABLE agents ALTER COLUMN chain_id TYPE varchar(32) USING chain_id::varchar(32)');

        DB::statement('ALTER TABLE tx_intents ALTER COLUMN chain_id TYPE varchar(32) USING chain_id::varchar(32)');
        DB::statement('ALTER TABLE tx_intents ALTER COLUMN to_address TYPE varchar(128)');
        DB::statement('ALTER TABLE tx_intents ALTER COLUMN decoded_recipient TYPE varchar(128)');
        DB::statement('ALTER TABLE tx_intents ALTER COLUMN decoded_token TYPE varchar(128)');

        DB::statement('ALTER TABLE token_registry ALTER COLUMN chain_id TYPE varchar(32) USING chain_id::varchar(32)');
        DB::statement('ALTER TABLE token_registry ALTER COLUMN address TYPE varchar(128)');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE agents ALTER COLUMN wallet_address TYPE varchar(42)');
        DB::statement('ALTER TABLE agents ALTER COLUMN chain_id TYPE integer USING chain_id::integer');

        Schema::table('agents', function (Blueprint $table) {
            $table->renameColumn('wallet_address', 'evm_address');
        });

        DB::statement('ALTER TABLE tx_intents ALTER COLUMN chain_id TYPE integer USING chain_id::integer');
        DB::statement('ALTER TABLE tx_intents ALTER COLUMN to_address TYPE varchar(42)');

        DB::statement('ALTER TABLE token_registry ALTER COLUMN chain_id TYPE integer USING chain_id::integer');
        DB::statement('ALTER TABLE token_registry ALTER COLUMN address TYPE varchar(42)');
    }
};
