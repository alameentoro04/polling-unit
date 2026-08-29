<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PollingUnit;
use Illuminate\Http\Request;

class MapController extends Controller
{
    public function pollingUnits(Request $request)
    {
        $scope = $request->attributes->get('data_scope');

        $query = PollingUnit::query()
            ->with(['ward.lga'])
            ->whereNotNull('latitude')
            ->whereNotNull('longitude');

        // Apply scope — ONLY if the value is not empty
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

        // Filter by status
        if ($request->has('status')) {
            $status = $request->status;
            $query->withCount(['registrations as reg_count' => fn($q) => $q->active()]);

            $pollingUnits = $query->get()->filter(function ($pu) use ($status) {
                $count = $pu->reg_count ?? 0;
                $target = $pu->target ?? 10;
                return match($status) {
                    'not_started' => $count === 0,
                    'in_progress' => $count > 0 && $count < $target,
                    'completed' => $count >= $target,
                    default => true,
                };
            })->values();
        } else {
            $pollingUnits = $query->get();
        }

        return response()->json($pollingUnits->map(function ($pu) {
            $registered = $pu->registrations()->whereNull('deleted_at')->count();
            $target = $pu->target ?? 10;
            $status = $registered === 0 ? 'not_started' : ($registered >= $target ? 'completed' : 'in_progress');

            return [
                'id' => $pu->id,
                'code' => $pu->code,
                'name' => $pu->name,
                'latitude' => (float)$pu->latitude,
                'longitude' => (float)$pu->longitude,
                'lga' => $pu->ward?->lga?->name,
                'ward' => $pu->ward?->name,
                'target' => $target,
                'registered' => $registered,
                'completion' => $target > 0 ? round(($registered / $target) * 100, 2) : 0,
                'status' => $status,
            ];
        }));
    }

    public function pollingUnitDetail($id)
    {
        $pu = PollingUnit::with(['ward.lga', 'registrations' => function($q) {
            $q->active()->orderBy('registered_at', 'desc')->limit(10);
        }])->findOrFail($id);

        $registered = $pu->registrations()->whereNull('deleted_at')->count();

        return response()->json([
            'id' => $pu->id,
            'code' => $pu->code,
            'name' => $pu->name,
            'latitude' => (float)$pu->latitude,
            'longitude' => (float)$pu->longitude,
            'lga' => $pu->ward?->lga?->name,
            'ward' => $pu->ward?->name,
            'target' => $pu->target ?? 10,
            'registered' => $registered,
            'completion' => ($pu->target ?? 10) > 0 ? round(($registered / ($pu->target ?? 10)) * 100, 2) : 0,
            'recent_registrations' => $pu->registrations,
        ]);
    }
}
