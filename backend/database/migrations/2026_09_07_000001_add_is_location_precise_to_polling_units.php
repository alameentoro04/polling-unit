<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('polling_units', function (Blueprint $table) {
 
            $table->boolean('is_location_precise')->default(true)->after('longitude');
        });
    }

    public function down(): void
    {
        Schema::table('polling_units', function (Blueprint $table) {
            $table->dropColumn('is_location_precise');
        });
    }
};
