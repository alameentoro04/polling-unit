<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Registration;
use App\Models\SyncQueue;
use App\Services\AuditService;
use App\Services\SyncService;
use Illuminate\Http\Request;

class SyncController extends Controller
{
    protected SyncService $syncService;

    public function __construct(SyncService $syncService)
    {
        $this->syncService = $syncService;
    }

    public function push(Request $request)
    {
        $agent = auth()->user();

        if (!$agent->isAgent()) {
            return response()->json(['message' => 'Only agents can sync'], 403);
        }

        $results = [];
        $records = $request->input('records', []);

        foreach ($records as $record) {
            $results[] = $this->syncService->processPush($record, $agent);
        }

        return response()->json(['results' => $results]);
    }

    public function status(Request $request)
    {
        $agent = auth()->user();
        $clientIds = $request->input('client_ids', []);

        $statuses = Registration::where('registered_by', $agent->id)
            ->whereIn('client_id', $clientIds)
            ->pluck('sync_status', 'client_id');

        return response()->json(['statuses' => $statuses]);
    }

    public function conflicts(Request $request)
    {
        $conflicts = Registration::where('sync_status', 'conflict')
            ->with(['pollingUnit', 'ward', 'lga', 'registeredBy'])
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return response()->json($conflicts);
    }

    public function resolveConflict(Request $request, $id)
    {
        $registration = Registration::findOrFail($id);

        if ($registration->sync_status !== 'conflict') {
            return response()->json(['message' => 'Not a conflict record'], 400);
        }

        $action = $request->input('action'); // merge, keep_both, reject

        switch ($action) {
            case 'merge':
            case 'reject':
                $registration->update(['sync_status' => 'synced', 'is_deleted' => true]);
                break;
            case 'keep_both':
                $registration->update(['sync_status' => 'synced']);
                break;
            default:
                return response()->json(['message' => 'Invalid action'], 422);
        }
        AuditService::logConflictResolved($registration, $action, auth()->id());

        return response()->json(['message' => 'Conflict resolved']);
    }
}
