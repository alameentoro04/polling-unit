<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use App\Models\AgentAssignment;
use App\Models\Registration;
use App\Models\SyncQueue;
use Illuminate\Support\Facades\Request;

class AuditService
{
    public static function log(
        string $action,
        string $entityType,
        ?string $entityId = null,
        ?array $beforeState = null,
        ?array $afterState = null,
        ?int $actorId = null
    ): AuditLog {
        return AuditLog::create([
            'actor_id' => $actorId ?? auth()->id(),
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'before_state' => $beforeState,
            'after_state' => $afterState,
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
        ]);
    }

    public static function logUserCreated(User $user, int $actorId): AuditLog
    {
        return self::log('USER_CREATED', 'user', (string)$user->id, null, $user->toArray(), $actorId);
    }

    public static function logUserUpdated(User $user, array $before, array $after, int $actorId): AuditLog
    {
        return self::log('USER_UPDATED', 'user', (string)$user->id, $before, $after, $actorId);
    }

    public static function logUserDeactivated(User $user, int $actorId): AuditLog
    {
        return self::log('USER_DEACTIVATED', 'user', (string)$user->id, ['is_active' => true], ['is_active' => false], $actorId);
    }

    public static function logAgentAssigned(AgentAssignment $assignment, int $actorId): AuditLog
    {
        return self::log('AGENT_ASSIGNED', 'agent_assignment', (string)$assignment->id, null, $assignment->load(['user', 'pollingUnit'])->toArray(), $actorId);
    }

    public static function logAgentReassigned(AgentAssignment $old, AgentAssignment $new, int $actorId): AuditLog
    {
        return self::log('AGENT_REASSIGNED', 'agent_assignment', (string)$new->id, $old->toArray(), $new->toArray(), $actorId);
    }

    public static function logRegistrationCreated(Registration $registration): AuditLog
    {
        return self::log('REGISTRATION_CREATED', 'registration', (string)$registration->id, null, $registration->toArray());
    }

    public static function logRegistrationUpdated(Registration $registration, array $before, array $after, int $actorId): AuditLog
    {
        return self::log('REGISTRATION_UPDATED', 'registration', (string)$registration->id, $before, $after, $actorId);
    }

    public static function logRegistrationDeleted(Registration $registration, int $actorId): AuditLog
    {
        return self::log('REGISTRATION_DELETED', 'registration', (string)$registration->id, $registration->toArray(), ['is_deleted' => true, 'deleted_at' => now()->toDateTimeString()], $actorId);
    }

    public static function logDuplicateDetected(string $pvcNumber, int $existingId, int $conflictId, int $actorId): AuditLog
    {
        return self::log('DUPLICATE_DETECTED', 'registration', (string)$conflictId, ['pvc_number' => $pvcNumber, 'existing_id' => $existingId], ['pvc_number' => $pvcNumber, 'conflict_id' => $conflictId], $actorId);
    }

    public static function logSyncConflict(SyncQueue $syncQueue, string $reason): AuditLog
    {
        return self::log('SYNC_CONFLICT', 'sync_queue', (string)$syncQueue->id, null, ['client_id' => $syncQueue->client_id, 'reason' => $reason]);
    }

    public static function logExcelImported(int $validRows, int $invalidRows, int $importedRows, int $actorId): AuditLog
    {
        return self::log('EXCEL_IMPORTED', 'import', null, null, ['valid' => $validRows, 'invalid' => $invalidRows, 'imported' => $importedRows], $actorId);
    }

    public static function logExcelExported(string $type, array $filters, int $actorId): AuditLog
    {
        return self::log('EXCEL_EXPORTED', 'export', null, null, ['type' => $type, 'filters' => $filters], $actorId);
    }
}
