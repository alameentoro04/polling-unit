<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * LGA coordinators and Ward coordinators need a scope, but the
     * agent_assignments table is for polling-unit agents specifically
     * (AdminController::assignAgent rejects non-agent users), so there was
     * previously no working way to actually scope a coordinator. Give
     * coordinators their own direct columns instead of overloading a table
     * that means something different for them.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('managed_lga_id')->nullable()->after('role_id')
                ->constrained('lgas')->nullOnDelete();
            $table->foreignId('managed_ward_id')->nullable()->after('managed_lga_id')
                ->constrained('wards')->nullOnDelete();
            $table->index('managed_lga_id');
            $table->index('managed_ward_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('managed_lga_id');
            $table->dropConstrainedForeignId('managed_ward_id');
        });
    }
};
