<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lga;
use App\Models\PollingUnit;
use App\Models\Registration;
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
    $puQuery = PollingUnit::query();
    $agentQuery = User::query()
        ->whereHas('role', fn($q) => $q->where('name', 'agent'));

    $this->applyScope($query, $scope);
    $this->applyScopeToPu($puQuery, $scope);

    $totalRegistrations = $query->count();
    $totalPUs = $puQuery->count();
    $totalAgents = $agentQuery->where('is_active', true)->count();
    $totalWards = Ward::count();
    $totalLgas = Lga::count();

    $target = $totalPUs * 10;

    $completion = $target > 0
        ? round(($totalRegistrations / $target) * 100, 2)
        : 0;

    // Count polling units that have reached their target of 10 registrations
    $completedPUsQuery = Registration::query()
        ->active()
        ->select('polling_unit_id')
        ->groupBy('polling_unit_id')
        ->havingRaw('COUNT(*) >= 10');

    $this->applyScope($completedPUsQuery, $scope);

    $completedPUs = $completedPUsQuery->get()->count();

    return response()->json([
        'total_lgas' => $totalLgas,
        'total_wards' => $totalWards,
        'total_polling_units' => $totalPUs,
        'total_agents' => $totalAgents,
        'total_registered' => $totalRegistrations,
        'total_target' => $target,
        'completion_percentage' => $completion,
        'completed_polling_units' => $completedPUs,
    ]);
}

    public function statusChecksum(Request $request)
    {
        $scope = $request->attributes->get('data_scope');
        $query = Registration::query()->active();
        $this->applyScope($query, $scope);

        $lastUpdated = $query->max('updated_at') ?? now();
        $count = $query->count();
        $checksum = md5($lastUpdated . $count);

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
                $target = $lga->pu_count * 10;
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
            ->when($lgaId, fn($q) => $q->where('lga_id', $lgaId))
            ->withCount(['registrations as registered_count' => function ($q) {
                $q->active();
            }])
            ->withCount('pollingUnits as pu_count')
            ->get()
            ->map(function ($ward) {
                $target = $ward->pu_count * 10;
                return [
                    'id' => $ward->id,
                    'name' => $ward->name,
                    'lga_name' => $ward->lga?->name,
                    'registered' => $ward->registered_count,
                    'target' => $target,
                    'completion' => $target > 0 ? round(($ward->registered_count / $target) * 100, 2) : 0,
                ];
            });

        if ($scope['type'] === 'ward') {
            $query = $query->where('id', $scope['ward_id']);
        } elseif ($scope['type'] === 'lga') {
            $query = $query->where('lga_id', $scope['lga_id']);
        }

        return response()->json($query->values());
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
            $target = $agent->assignedPollingUnit?->target_count ?: 10;
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
            ->withCount(['registrations as active_registrations_count' => fn($q) => $q->active()]);
        $this->applyScopeToPu($puQuery, $scope);

        // Pull counts in one query instead of looping and issuing a
        // separate registrations()->count() query per polling unit — with
        // the real ~4,000-unit Bauchi dataset the old loop made this
        // endpoint take seconds and hammered the DB on every dashboard poll.
        $notStarted = 0;
        $inProgress = 0;
        $completed = 0;

        foreach ($puQuery->get(['id', 'target_count']) as $pu) {
            $count = $pu->active_registrations_count;
            $target = $pu->target_count ?: 10;
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
