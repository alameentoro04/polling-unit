<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('complaints', function (Blueprint $table) {
            $table->id();

            $table->string('client_id', 64)->unique();

            $table->foreignId('submitted_by')->constrained('users'); // the agent
            $table->foreignId('polling_unit_id')->constrained('polling_units');
            $table->foreignId('ward_id')->constrained('wards');
            $table->foreignId('lga_id')->constrained('lgas');

            $table->enum('complainant_type', ['agent', 'voter'])->default('agent');
            $table->string('complainant_name')->nullable();
            $table->string('complainant_phone', 20)->nullable();

            $table->text('complaint_text');
            $table->enum('status', ['open', 'reviewed', 'resolved'])->default('open');

            $table->timestamp('submitted_at');
            $table->timestamps();

            $table->index('status');
            $table->index('polling_unit_id');
            $table->index('submitted_by');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('complaints');
    }
};
