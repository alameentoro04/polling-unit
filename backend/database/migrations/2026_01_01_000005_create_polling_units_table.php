<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('polling_units', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ward_id')->constrained('wards')->onDelete('cascade');
            $table->string('code', 50)->unique();
            $table->string('name');
            $table->text('location')->nullable();
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            $table->unsignedInteger('target_count')->default(10);
            $table->timestamps();
            $table->index('ward_id');
            $table->index('code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('polling_units');
    }
};
