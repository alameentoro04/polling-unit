<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The agent app currently stores photos as base64 data: URLs, which are
     * tens of KB — far larger than the default VARCHAR(255) photograph_url
     * column, causing silent truncation or a DB error on insert.
     *
     * This is a stopgap. The better long-term fix (see notes to team) is to
     * upload the photo as a real file via multipart/form-data and store only
     * a storage path/URL here, not the raw image bytes. Widening the column
     * avoids data loss in the meantime.
     */
    public function up(): void
    {
        Schema::table('registrations', function (Blueprint $table) {
            $table->longText('photograph_url')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('registrations', function (Blueprint $table) {
            $table->string('photograph_url')->nullable()->change();
        });
    }
};
