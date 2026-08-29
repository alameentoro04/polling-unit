<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('registrations', function (Blueprint $table) {
            $table->id();
            $table->string('client_id', 64)->unique()->nullable();
            $table->string('pvc_number', 20);
            $table->string('full_name');
            $table->string('phone_number', 20)->nullable();
            $table->date('date_of_birth')->nullable();
            $table->enum('gender', ['male', 'female', 'other'])->nullable();
            $table->string('photograph_url')->nullable();
            $table->foreignId('polling_unit_id')->constrained('polling_units');
            $table->foreignId('ward_id')->constrained('wards');
            $table->foreignId('lga_id')->constrained('lgas');
            $table->foreignId('registered_by')->constrained('users');
            $table->timestamp('registered_at');
            $table->enum('sync_status', ['pending', 'syncing', 'synced', 'conflict', 'failed'])->default('synced');
            $table->json('sync_metadata')->nullable();
            $table->boolean('is_deleted')->default(false);
            $table->foreignId('deleted_by')->nullable()->constrained('users');
            $table->timestamp('deleted_at')->nullable();
            $table->timestamps();

            $table->index('pvc_number');
            $table->index('client_id');
            $table->index('registered_by');
            $table->index('polling_unit_id');
            $table->index('ward_id');
            $table->index('lga_id');
            $table->index('sync_status');
            $table->index('is_deleted');
            $table->index('registered_at');
            $table->fullText('full_name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('registrations');
    }
};
