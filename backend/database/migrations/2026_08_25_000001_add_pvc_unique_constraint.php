<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Enforce PVC uniqueness at the database level among active (non-deleted)
     * registrations. We can't put a plain unique() on pvc_number because a
     * PVC is allowed to reappear once the original record is soft-deleted
     * (e.g. an admin deletes a bad entry), and conflict records intentionally
     * share a PVC with the record they conflicted against. Instead we add a
     * unique index on (pvc_number, is_deleted) is not quite right either
     * (two active dupes with is_deleted=0 would still collide correctly,
     * but conflict rows also have is_deleted=0) — so uniqueness is enforced
     * in application code (SyncService) guarded by a row lock, and this
     * migration adds a partial unique index for the databases that support
     * it (Postgres/SQLite) to provide a hard backstop against races.
     */
    public function up(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'sqlite') {
            DB::statement(
                'CREATE UNIQUE INDEX registrations_active_pvc_unique
                 ON registrations (pvc_number)
                 WHERE is_deleted = 0 AND sync_status != "conflict"'
            );
        } elseif ($driver === 'pgsql') {
            DB::statement(
                'CREATE UNIQUE INDEX registrations_active_pvc_unique
                 ON registrations (pvc_number)
                 WHERE is_deleted = false AND sync_status != \'conflict\''
            );
        }
        // MySQL/MariaDB has no partial/filtered unique index support without
        // generated columns. If you're deploying on MySQL, see the note in
        // SETUP_GUIDE.md — the app-level row lock in SyncService::processPush
        // is the primary guard there.
    }

    public function down(): void
    {
        $driver = DB::connection()->getDriverName();
        if ($driver === 'sqlite' || $driver === 'pgsql') {
            Schema::table('registrations', function ($table) {
                $table->dropIndex('registrations_active_pvc_unique');
            });
        }
    }
};
