<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('agent_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('polling_unit_id')->constrained('polling_units')->onDelete('cascade');
            $table->foreignId('assigned_by')->constrained('users');
            $table->timestamp('assigned_at');
            $table->timestamp('unassigned_at')->nullable();
            $table->boolean('is_current')->default(true);
            $table->timestamps();
            $table->index(['user_id', 'is_current']);
            $table->index(['polling_unit_id', 'is_current']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agent_assignments');
    }
};
