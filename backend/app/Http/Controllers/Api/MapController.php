<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AgentAssignment;
use App\Models\PollingUnit;
use App\Models\Setting;
use Illuminate\Http\Request;

class MapController extends Controller
{
    public function pollingUnits(Request $request)
    {
        $scope = $request->attributes->get('data_scope');

        $query = PollingUnit::query()
            ->where('is_active', true)
            ->with(['ward.lga'])
            ->withCount(['registrations as active_registrations_count' => fn($q) => $q->active()])
            ->whereNotNull('latitude')
            ->whereNotNull('longitude');

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

        if ($request->filled('lga_id')) {
            $query->whereHas('ward', fn($q) => $q->where('lga_id', $request->input('lga_id')));
        }
        if ($request->filled('ward_id')) {
            $query->where('ward_id', $request->input('ward_id'));
        }
        if ($request->filled('polling_unit_id')) {
            $query->where('id', $request->input('polling_unit_id'));
        }

        $pollingUnits = $query->get()->map(function ($pu) {
            $registered = $pu->active_registrations_count;
            $target = $pu->target_count ?: Setting::get('target_per_pu', 10);
            $status = $registered === 0 ? 'not_started' : ($registered >= $target ? 'completed' : 'in_progress');

            return [
                'id' => $pu->id,
                'code' => $pu->code,
                'name' => $pu->name,
                'latitude' => (float) $pu->latitude,
                'longitude' => (float) $pu->longitude,
                'is_location_precise' => (bool) $pu->is_location_precise,
                'lga' => $pu->ward?->lga?->name,
                'ward' => $pu->ward?->name,
                'target' => $target,
                'registered' => $registered,
                'completion' => $target > 0 ? round(($registered / $target) * 100, 2) : 0,
                'status' => $status,
            ];
        });

        if ($request->filled('status')) {
            $status = $request->string('status')->toString();
            $pollingUnits = $pollingUnits->where('status', $status)->values();
        }

        return response()->json($pollingUnits);
    }

    public function pollingUnitDetail($id)
    {
        $pu = PollingUnit::with(['ward.lga', 'registrations' => function ($q) {
            $q->active()->orderBy('registered_at', 'desc')->limit(10);
        }])
            ->withCount(['registrations as active_registrations_count' => fn($q) => $q->active()])
            ->findOrFail($id);

        $currentAssignment = AgentAssignment::with('user')
            ->where('polling_unit_id', $pu->id)
            ->where('is_current', true)
            ->latest('assigned_at')
            ->first();

        $registered = $pu->active_registrations_count;
        $target = $pu->target_count ?: Setting::get('target_per_pu', 10);

        return response()->json([
            'id' => $pu->id,
            'code' => $pu->code,
            'name' => $pu->name,
            'location' => $pu->location,
            'latitude' => (float) $pu->latitude,
            'longitude' => (float) $pu->longitude,
            'is_location_precise' => (bool) $pu->is_location_precise,
            'lga' => $pu->ward?->lga?->name,
            'ward' => $pu->ward?->name,
            'target' => $target,
            'registered' => $registered,
            'completion' => $target > 0 ? round(($registered / $target) * 100, 2) : 0,
            'current_agent' => $currentAssignment ? [
                'name' => $currentAssignment->user?->full_name,
                'assigned_at' => $currentAssignment->assigned_at,
            ] : null,
            'recent_registrations' => $pu->registrations,
        ]);
    }
}
