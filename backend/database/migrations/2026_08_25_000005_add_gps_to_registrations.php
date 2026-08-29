<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('registrations', function (Blueprint $table) {
            $table->decimal('gps_latitude', 10, 8)->nullable()->after('photograph_url');
            $table->decimal('gps_longitude', 11, 8)->nullable()->after('gps_latitude');
            $table->decimal('gps_accuracy', 8, 2)->nullable()->after('gps_longitude');
        });
    }

    public function down(): void
    {
        Schema::table('registrations', function (Blueprint $table) {
            $table->dropColumn(['gps_latitude', 'gps_longitude', 'gps_accuracy']);
        });
    }
};
