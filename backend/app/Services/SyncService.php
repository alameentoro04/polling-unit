<?php

namespace App\Services;

use App\Models\Registration;
use App\Models\SyncQueue;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SyncService
{
    public function processPush(array $payload, User $agent): array
    {
        $clientId = $payload['client_id'] ?? null;
        $deviceId = $payload['device_id'] ?? null;

        if (!$clientId) {
            return ['status' => 'error', 'message' => 'client_id is required'];
        }

        $existingSync = SyncQueue::where('client_id', $clientId)->first();
        if ($existingSync && $existingSync->status === 'processed') {
            $registration = Registration::where('client_id', $clientId)->first();
            return [
                'status' => 'already_synced',
                'registration_id' => $registration?->id,
                'client_id' => $clientId
            ];
        }

        $syncQueue = SyncQueue::updateOrCreate(
            ['client_id' => $clientId],
            [
                'device_id' => $deviceId,
                'user_id' => $agent->id,
                'payload' => $payload,
                'status' => 'received',
            ]
        );

        try {
            DB::beginTransaction();

            $result = $this->processRegistration($payload, $agent, $syncQueue);

            $syncQueue->update(['status' => 'processed', 'processed_at' => now()]);
            DB::commit();

            return $result;
        } catch (\Exception $e) {
            DB::rollBack();
            $syncQueue->update([
                'status' => 'failed',
                'error_message' => $e->getMessage()
            ]);
            Log::error('Sync failed', ['client_id' => $clientId, 'error' => $e->getMessage()]);
            return ['status' => 'failed', 'message' => $e->getMessage(), 'client_id' => $clientId];
        }
    }

    private function processRegistration(array $payload, User $agent, SyncQueue $syncQueue): array
    {
        $pvcNumber = strtoupper(trim($payload['pvc_number'] ?? ''));
        $assignment = $agent->currentAssignment();

        if (!$assignment) {
            throw new \Exception('Agent has no assigned polling unit');
        }

        $pollingUnit = $assignment->pollingUnit;

        
        $existing = Registration::whereRaw('LOWER(pvc_number) = ?', [strtolower($pvcNumber)])
            ->where('is_deleted', false)
            ->lockForUpdate()
            ->first();

        if ($existing) {
            // Create conflict record
            $conflict = Registration::create([
                'client_id' => $payload['client_id'],
                'pvc_number' => $pvcNumber,
                'full_name' => $payload['full_name'] ?? '',
                'phone_number' => $payload['phone_number'] ?? null,
                'date_of_birth' => $payload['date_of_birth'] ?? null,
                'gender' => $payload['gender'] ?? null,
                'photograph_url' => $payload['photograph_url'] ?? null,
                'gps_latitude' => $payload['gps_latitude'] ?? null,
                'gps_longitude' => $payload['gps_longitude'] ?? null,
                'gps_accuracy' => $payload['gps_accuracy'] ?? null,
                'dynamic_data' => $payload['dynamic_data'] ?? null,
                'polling_unit_id' => $pollingUnit->id,
                'ward_id' => $pollingUnit->ward_id,
                'lga_id' => $pollingUnit->ward->lga_id,
                'registered_by' => $agent->id,
                'registered_at' => $payload['registered_at'] ?? now(),
                'sync_status' => 'conflict',
                'sync_metadata' => [
                    'conflict_reason' => 'DUPLICATE_PVC',
                    'existing_registration_id' => $existing->id,
                    'existing_agent_id' => $existing->registered_by,
                ],
            ]);

            AuditService::logDuplicateDetected($pvcNumber, $existing->id, $conflict->id, $agent->id);
            AuditService::logSyncConflict($syncQueue, "Duplicate PVC: {$pvcNumber} already exists in registration {$existing->id}");

            return [
                'status' => 'conflict',
                'message' => 'PVC number already exists',
                'registration_id' => $conflict->id,
                'client_id' => $payload['client_id'],
                'existing_id' => $existing->id,
            ];
        }

        
        try {
            $registration = Registration::create([
                'client_id' => $payload['client_id'],
                'pvc_number' => $pvcNumber,
                'full_name' => $payload['full_name'] ?? '',
                'phone_number' => $payload['phone_number'] ?? null,
                'date_of_birth' => $payload['date_of_birth'] ?? null,
                'gender' => $payload['gender'] ?? null,
                'photograph_url' => $payload['photograph_url'] ?? null,
                'gps_latitude' => $payload['gps_latitude'] ?? null,
                'gps_longitude' => $payload['gps_longitude'] ?? null,
                'gps_accuracy' => $payload['gps_accuracy'] ?? null,
                'dynamic_data' => $payload['dynamic_data'] ?? null,
                'polling_unit_id' => $pollingUnit->id,
                'ward_id' => $pollingUnit->ward_id,
                'lga_id' => $pollingUnit->ward->lga_id,
                'registered_by' => $agent->id,
                'registered_at' => $payload['registered_at'] ?? now(),
                'sync_status' => 'synced',
            ]);
        } catch (\Illuminate\Database\QueryException $e) {
            if ($this->isUniqueViolation($e)) {
                $winner = Registration::whereRaw('LOWER(pvc_number) = ?', [strtolower($pvcNumber)])
                    ->where('is_deleted', false)
                    ->where('sync_status', 'synced')
                    ->first();

                $conflict = Registration::create([
                    'client_id' => $payload['client_id'],
                    'pvc_number' => $pvcNumber,
                    'full_name' => $payload['full_name'] ?? '',
                    'phone_number' => $payload['phone_number'] ?? null,
                    'date_of_birth' => $payload['date_of_birth'] ?? null,
                    'gender' => $payload['gender'] ?? null,
                    'photograph_url' => $payload['photograph_url'] ?? null,
                    'gps_latitude' => $payload['gps_latitude'] ?? null,
                    'gps_longitude' => $payload['gps_longitude'] ?? null,
                    'gps_accuracy' => $payload['gps_accuracy'] ?? null,
                    'dynamic_data' => $payload['dynamic_data'] ?? null,
                    'polling_unit_id' => $pollingUnit->id,
                    'ward_id' => $pollingUnit->ward_id,
                    'lga_id' => $pollingUnit->ward->lga_id,
                    'registered_by' => $agent->id,
                    'registered_at' => $payload['registered_at'] ?? now(),
                    'sync_status' => 'conflict',
                    'sync_metadata' => [
                        'conflict_reason' => 'DUPLICATE_PVC_RACE',
                        'existing_registration_id' => $winner?->id,
                        'existing_agent_id' => $winner?->registered_by,
                    ],
                ]);

                AuditService::logSyncConflict($syncQueue, "Duplicate PVC (race): {$pvcNumber}");

                return [
                    'status' => 'conflict',
                    'message' => 'PVC number already exists',
                    'registration_id' => $conflict->id,
                    'client_id' => $payload['client_id'],
                    'existing_id' => $winner?->id,
                ];
            }
            throw $e;
        }

        AuditService::logRegistrationCreated($registration);

        return [
            'status' => 'synced',
            'registration_id' => $registration->id,
            'client_id' => $payload['client_id'],
        ];
    }

    private function isUniqueViolation(\Illuminate\Database\QueryException $e): bool
    {
        
        return $e->getCode() === '23000';
    }
}
