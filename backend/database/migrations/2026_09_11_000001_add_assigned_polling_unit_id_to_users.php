<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('assigned_polling_unit_id')->nullable()->after('managed_ward_id')
                ->constrained('polling_units')->nullOnDelete();
            $table->index('assigned_polling_unit_id');
        });

        \Illuminate\Support\Facades\DB::statement('
            UPDATE users u
            INNER JOIN agent_assignments aa ON aa.user_id = u.id AND aa.is_current = 1
            SET u.assigned_polling_unit_id = aa.polling_unit_id
        ');
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('assigned_polling_unit_id');
        });
    }
};
