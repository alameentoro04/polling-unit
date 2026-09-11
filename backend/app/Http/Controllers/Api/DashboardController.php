<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Complaint;
use App\Models\Lga;
use App\Models\PollingUnit;
use App\Models\Registration;
use App\Models\Setting;
use App\Models\User;
use App\Models\Ward;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function summary(Request $request)
{
    $scope = $request->attributes->get('data_scope');

    $query = Registration::query()->active();
    $puQuery = PollingUnit::query()->where('is_active', true);
    $agentQuery = User::query()
        ->whereHas('role', fn($q) => $q->where('name', 'agent'));

    $this->applyScope($query, $scope);
    $this->applyScopeToPu($puQuery, $scope);

    $totalRegistrations = $query->count();
    $totalPUs = $puQuery->count();
    $totalAgents = $agentQuery->where('is_active', true)->count();

    if (($scope['type'] ?? 'all') === 'lga' && !empty($scope['lga_id'])) {
        $totalLgas = 1;
        $totalWards = Ward::where('lga_id', $scope['lga_id'])->count();
    } elseif (($scope['type'] ?? 'all') === 'ward' && !empty($scope['ward_id'])) {
        $totalLgas = 1;
        $totalWards = 1;
    } else {
        $totalWards = Ward::count();
        $totalLgas = Lga::count();
    }

    $target = $totalPUs * Setting::get('target_per_pu', 10);

    $completion = $target > 0
        ? round(($totalRegistrations / $target) * 100, 2)
        : 0;

    $defaultTarget = Setting::get('target_per_pu', 10);
    $countsByPuQuery = Registration::query()->active();
    $this->applyScope($countsByPuQuery, $scope);
    $countsByPu = $countsByPuQuery
        ->select('polling_unit_id', DB::raw('COUNT(*) as cnt'))
        ->groupBy('polling_unit_id')
        ->pluck('cnt', 'polling_unit_id');

    $targetsByPu = PollingUnit::whereIn('id', $countsByPu->keys())->pluck('target_count', 'id');

    $completedPUs = $countsByPu->filter(function ($count, $puId) use ($targetsByPu, $defaultTarget) {
        $target = $targetsByPu[$puId] ?: $defaultTarget;
        return $count >= $target;
    })->count();

    $complaintsQuery = Complaint::query()->where('status', 'open');
    switch ($scope['type'] ?? 'all') {
        case 'lga':
            if (!empty($scope['lga_id'])) $complaintsQuery->where('lga_id', $scope['lga_id']);
            break;
        case 'ward':
            if (!empty($scope['ward_id'])) $complaintsQuery->where('ward_id', $scope['ward_id']);
            break;
    }
    $openComplaints = $complaintsQuery->count();

    $pendingSyncQuery = \App\Models\SyncQueue::where('status', 'failed');
    if (($scope['type'] ?? 'all') === 'agent' && !empty($scope['registered_by'])) {
        $pendingSyncQuery->where('user_id', $scope['registered_by']);
    }
    $pendingSync = $pendingSyncQuery->count();

    $conflictsQuery = Registration::query()->where('sync_status', 'conflict')->where('is_deleted', false);
    $this->applyScope($conflictsQuery, $scope);
    $conflicts = $conflictsQuery->count();

    return response()->json([
        'total_lgas' => $totalLgas,
        'total_wards' => $totalWards,
        'total_polling_units' => $totalPUs,
        'total_agents' => $totalAgents,
        'total_registered' => $totalRegistrations,
        'total_target' => $target,
        'completion_percentage' => $completion,
        'completed_polling_units' => $completedPUs,
        'open_complaints' => $openComplaints,
        'pending_sync' => $pendingSync,
        'conflicts' => $conflicts,
    ]);
}

    public function activityFeed(Request $request)
    {
        $limit = min((int) $request->input('limit', 20), 50);

        $logs = \App\Models\AuditLog::with('actor')
            ->whereIn('action', [
                'REGISTRATION_CREATED', 'SYNC_CONFLICT', 'DUPLICATE_DETECTED',
                'COMPLAINT_SUBMITTED', 'POLLING_UNIT_TARGET_REACHED',
                'AGENT_ASSIGNED', 'AGENT_REASSIGNED', 'WARD_CREATED',
                'POLLING_UNIT_CREATED', 'EXCEL_IMPORTED', 'SYNC_CONFLICT_RESOLVED',
                'COMPLAINT_STATUS_UPDATED',
            ])
            ->where('created_at', '>=', now()->subHours(24))
            ->orderByDesc('created_at')
            ->limit(300) // raw rows before aggregation, not the final feed size
            ->get();

        $items = [];

        $registrationLogs = $logs->where('action', 'REGISTRATION_CREATED');
        $regBuckets = $registrationLogs->groupBy(function ($log) {
            return $log->actor_id . '|' . floor($log->created_at->timestamp / 600);
        });
        foreach ($regBuckets as $bucket) {
            $actor = $bucket->first()->actor;
            $items[] = [
                'id' => 'reg-' . $bucket->first()->id,
                'type' => 'registration',
                'message' => ($actor?->full_name ?? 'An agent') . ' synced ' . $bucket->count() . ' registration' . ($bucket->count() === 1 ? '' : 's'),
                'timestamp' => $bucket->max('created_at'),
            ];
        }

        $conflictLogs = $logs->whereIn('action', ['SYNC_CONFLICT', 'DUPLICATE_DETECTED']);
        $conflictBuckets = $conflictLogs->groupBy(function ($log) {
            return floor($log->created_at->timestamp / 600);
        });
        foreach ($conflictBuckets as $bucket) {
            $count = $bucket->where('action', 'DUPLICATE_DETECTED')->count() ?: $bucket->count();
            $items[] = [
                'id' => 'conflict-' . $bucket->first()->id,
                'type' => 'conflict',
                'message' => $count . ' registration conflict' . ($count === 1 ? '' : 's') . ' detected',
                'timestamp' => $bucket->max('created_at'),
            ];
        }

        foreach ($logs->where('action', 'COMPLAINT_SUBMITTED') as $log) {
            $items[] = [
                'id' => 'complaint-' . $log->id,
                'type' => 'complaint',
                'message' => 'New complaint from ' . ($log->actor?->full_name ?? 'an agent'),
                'timestamp' => $log->created_at,
            ];
        }

        foreach ($logs->where('action', 'POLLING_UNIT_TARGET_REACHED') as $log) {
            $name = $log->after_state['name'] ?? $log->after_state['code'] ?? 'A polling unit';
            $items[] = [
                'id' => 'target-' . $log->id,
                'type' => 'target',
                'message' => $name . ' reached its target',
                'timestamp' => $log->created_at,
            ];
        }

        foreach ($logs->whereIn('action', ['AGENT_ASSIGNED', 'AGENT_REASSIGNED']) as $log) {
            $agentName = $log->after_state['user']['full_name'] ?? 'An agent';
            $puName = $log->after_state['polling_unit']['name'] ?? 'a polling unit';
            $items[] = [
                'id' => 'assign-' . $log->id,
                'type' => 'assignment',
                'message' => $agentName . ' assigned to ' . $puName,
                'timestamp' => $log->created_at,
            ];
        }

        $labels = [
            'WARD_CREATED' => 'A new ward was added',
            'POLLING_UNIT_CREATED' => 'A new polling unit was added',
            'EXCEL_IMPORTED' => 'Polling unit data imported from Excel',
            'SYNC_CONFLICT_RESOLVED' => 'A sync conflict was resolved',
            'COMPLAINT_STATUS_UPDATED' => 'A complaint status was updated',
        ];
        foreach ($logs->whereIn('action', array_keys($labels)) as $log) {
            $items[] = [
                'id' => 'misc-' . $log->id,
                'type' => 'info',
                'message' => $labels[$log->action] . ($log->actor ? ' by ' . $log->actor->full_name : ''),
                'timestamp' => $log->created_at,
            ];
        }

        $recentlyOffline = User::whereHas('role', fn($q) => $q->where('name', 'agent'))
            ->whereNotNull('last_seen_at')
            ->where('last_seen_at', '<=', now()->subMinutes(5))
            ->where('last_seen_at', '>=', now()->subMinutes(20))
            ->get();
        foreach ($recentlyOffline as $agent) {
            $items[] = [
                'id' => 'offline-' . $agent->id,
                'type' => 'offline',
                'message' => $agent->full_name . ' went offline',
                'timestamp' => $agent->last_seen_at->addMinutes(5),
            ];
        }

        usort($items, fn($a, $b) => strtotime($b['timestamp']) <=> strtotime($a['timestamp']));

        return response()->json(array_slice($items, 0, $limit));
    }

    public function statusChecksum(Request $request)
    {
        $scope = $request->attributes->get('data_scope');
        $query = Registration::query()->active();
        $this->applyScope($query, $scope);

        $lastUpdated = $query->max('updated_at') ?? now();
        $count = $query->count();

        $complaintsUpdated = Complaint::max('updated_at') ?? now();
        $complaintsCount = Complaint::count();

        $checksum = md5($lastUpdated . $count . $complaintsUpdated . $complaintsCount);

        return response()->json([
            'last_updated' => $lastUpdated,
            'total_count' => $count,
            'checksum' => $checksum,
        ]);
    }

    public function dailyStats(Request $request)
    {
        $scope = $request->attributes->get('data_scope');
        $days = $request->input('days', 14);

        $query = Registration::query()
            ->active()
            ->selectRaw('DATE(registered_at) as date, COUNT(*) as count')
            ->where('registered_at', '>=', now()->subDays($days))
            ->groupBy('date')
            ->orderBy('date');

        $this->applyScope($query, $scope);

        return response()->json($query->get());
    }

    public function lgaPerformance(Request $request)
    {
        $scope = $request->attributes->get('data_scope');

        $query = Lga::query()
            ->withCount(['registrations as registered_count' => function ($q) {
                $q->active();
            }])
            ->withCount('pollingUnits as pu_count')
            ->get()
            ->map(function ($lga) {
                $target = $lga->pu_count * Setting::get('target_per_pu', 10);
                return [
                    'id' => $lga->id,
                    'name' => $lga->name,
                    'registered' => $lga->registered_count,
                    'target' => $target,
                    'completion' => $target > 0 ? round(($lga->registered_count / $target) * 100, 2) : 0,
                ];
            });

        if ($scope['type'] === 'lga') {
            $query = $query->where('id', $scope['lga_id']);
        }

        return response()->json($query->values());
    }

    public function wardPerformance(Request $request)
    {
        $scope = $request->attributes->get('data_scope');
        $lgaId = $request->input('lga_id');

        $query = Ward::query()
            ->with('lga')
            ->when($lgaId, fn($q) => $q->where('lga_id', $lgaId))
            ->withCount(['registrations as registered_count' => function ($q) {
                $q->active();
            }])
            ->withCount('pollingUnits as pu_count');

        if (($scope['type'] ?? 'all') === 'ward') {
            $query->where('id', $scope['ward_id']);
        } elseif (($scope['type'] ?? 'all') === 'lga') {
            $query->where('lga_id', $scope['lga_id']);
        }

        $wards = $query->get()->map(function ($ward) {
            $target = $ward->pu_count * Setting::get('target_per_pu', 10);
            return [
                'id' => $ward->id,
                'name' => $ward->name,
                'lga_name' => $ward->lga?->name,
                'registered' => $ward->registered_count,
                'target' => $target,
                'completion' => $target > 0 ? round(($ward->registered_count / $target) * 100, 2) : 0,
            ];
        });

        return response()->json($wards->values());
    }

    public function agentPerformance(Request $request)
    {
        $scope = $request->attributes->get('data_scope');
        $lgaId = $request->input('lga_id');

        $query = User::query()
            ->whereHas('role', fn($q) => $q->where('name', 'agent'))
            ->withCount(['registrations as registered_count' => function ($q) {
                $q->active();
            }])
            ->with('assignedPollingUnit.ward.lga');

        if ($lgaId) {
            $query->whereHas('assignedPollingUnit.ward', fn($q) => $q->where('lga_id', $lgaId));
        }

        if (($scope['type'] ?? 'all') === 'agent') {
            $query->where('id', $scope['registered_by']);
        }

        $agents = $query->get()->map(function ($agent) {
            $target = $agent->assignedPollingUnit?->target_count ?: Setting::get('target_per_pu', 10);
            return [
                'id' => $agent->id,
                'name' => $agent->full_name,
                'polling_unit' => $agent->assignedPollingUnit?->name,
                'lga' => $agent->assignedPollingUnit?->ward?->lga?->name,
                'registered' => $agent->registered_count,
                'target' => $target,
            ];
        });

        return response()->json($agents->values());
    }

    public function completionDistribution(Request $request)
    {
        $scope = $request->attributes->get('data_scope');

        $puQuery = PollingUnit::query()
            ->where('is_active', true)
            ->withCount(['registrations as active_registrations_count' => fn($q) => $q->active()]);
        $this->applyScopeToPu($puQuery, $scope);

        $notStarted = 0;
        $inProgress = 0;
        $completed = 0;

        foreach ($puQuery->get(['id', 'target_count']) as $pu) {
            $count = $pu->active_registrations_count;
            $target = $pu->target_count ?: Setting::get('target_per_pu', 10);
            if ($count === 0) $notStarted++;
            elseif ($count >= $target) $completed++;
            else $inProgress++;
        }

        return response()->json([
            'not_started' => $notStarted,
            'in_progress' => $inProgress,
            'completed' => $completed,
        ]);
    }

    private function applyScope($query, array $scope)
    {
        switch ($scope['type'] ?? 'all') {
            case 'lga':
                $query->where('lga_id', $scope['lga_id']);
                break;
            case 'ward':
                $query->where('ward_id', $scope['ward_id']);
                break;
            case 'agent':
                $query->where('registered_by', $scope['registered_by']);
                break;
        }
    }

        private function applyScopeToPu($query, array $scope)
    {
        switch ($scope['type'] ?? 'all') {
            case 'lga':
                if (!empty($scope['lga_id'])) {
                    $query->whereHas('ward', fn($q) => $q->where('lga_id', $scope['lga_id']));
                }
                break;
            case 'ward':
                if (!empty($scope['ward_id'])) {
                    $query->where('ward_id', $scope['ward_id']);
                }
                break;
            case 'agent':
                if (!empty($scope['polling_unit_id'])) {
                    $query->where('id', $scope['polling_unit_id']);
                }
                break;
        }
    }

}
