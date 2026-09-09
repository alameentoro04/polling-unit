<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AgentAssignment;
use App\Models\PollingUnit;
use App\Models\Registration;
use App\Models\Setting;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PollingUnitController extends Controller
{
    public function index(Request $request)
    {
        $scope = $request->attributes->get('data_scope');

        $query = PollingUnit::query()
            ->with(['ward.lga', 'assignedAgent'])
            ->withCount(['registrations as registered_count' => fn($q) => $q->active()]);

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
            $query->whereHas('ward', fn($q) => $q->where('lga_id', $request->lga_id));
        }
        if ($request->filled('ward_id')) {
            $query->where('ward_id', $request->ward_id);
        }
        if ($request->filled('status')) {
            $query->where('is_active', $request->status === 'active');
        }
        if ($request->filled('q')) {
            $q = strtolower($request->input('q'));
            $query->where(function ($sub) use ($q) {
                $sub->whereRaw('LOWER(name) LIKE ?', ["%{$q}%"])
                    ->orWhereRaw('LOWER(code) LIKE ?', ["%{$q}%"]);
            });
        }

        $pollingUnits = $query->orderBy('name')->paginate(50);

        return response()->json($pollingUnits);
    }

    public function show($id)
    {
        $pu = PollingUnit::with(['ward.lga', 'assignedAgent'])
            ->withCount(['registrations as registered_count' => fn($q) => $q->active()])
            ->findOrFail($id);

        $history = AgentAssignment::with('user')
            ->where('polling_unit_id', $id)
            ->orderByDesc('assigned_at')
            ->get();

        return response()->json([
            'polling_unit' => $pu,
            'assignment_history' => $history,
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'ward_id' => 'required|exists:wards,id',
            'code' => 'required|string|max:50|unique:polling_units,code',
            'name' => 'required|string|max:255',
            'location' => 'nullable|string',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'target_count' => 'nullable|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $pu = PollingUnit::create([
            'ward_id' => $request->ward_id,
            'code' => trim($request->code),
            'name' => trim($request->name),
            'location' => $request->location,
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'is_location_precise' => $request->filled('latitude') && $request->filled('longitude'),
            'target_count' => $request->input('target_count') ?: Setting::get('target_per_pu', 10),
            'is_active' => true,
        ]);

        AuditService::log('POLLING_UNIT_CREATED', 'polling_unit', (string) $pu->id, null, $pu->toArray(), auth()->id());

        return response()->json($pu->load('ward.lga'), 201);
    }

    public function update(Request $request, $id)
    {
        $pu = PollingUnit::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'ward_id' => 'sometimes|required|exists:wards,id',
            'code' => 'sometimes|required|string|max:50|unique:polling_units,code,' . $pu->id,
            'name' => 'sometimes|required|string|max:255',
            'location' => 'nullable|string',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'target_count' => 'sometimes|integer|min:1',
            'is_active' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $before = $pu->toArray();

        $data = $request->only(['ward_id', 'code', 'name', 'location', 'latitude', 'longitude', 'target_count', 'is_active']);
        if (array_key_exists('latitude', $data) || array_key_exists('longitude', $data)) {
            $data['is_location_precise'] = !empty($data['latitude'] ?? $pu->latitude) && !empty($data['longitude'] ?? $pu->longitude);
        }

        $pu->update($data);

        AuditService::log('POLLING_UNIT_UPDATED', 'polling_unit', (string) $pu->id, $before, $pu->fresh()->toArray(), auth()->id());

        return response()->json($pu->fresh()->load('ward.lga'));
    }

    public function destroy($id)
    {
        $pu = PollingUnit::findOrFail($id);

        $hasRegistrations = Registration::where('polling_unit_id', $id)->exists();
        $hasHistory = AgentAssignment::where('polling_unit_id', $id)->exists();

        if ($hasRegistrations || $hasHistory) {
            $pu->update(['is_active' => false]);
            AuditService::log('POLLING_UNIT_DEACTIVATED', 'polling_unit', (string) $pu->id, ['is_active' => true], ['is_active' => false], auth()->id());

            return response()->json([
                'message' => 'This polling unit has registrations or assignment history, so it was deactivated rather than deleted, to avoid losing that data.',
                'action' => 'deactivated',
            ]);
        }

        AuditService::log('POLLING_UNIT_DELETED', 'polling_unit', (string) $pu->id, $pu->toArray(), null, auth()->id());
        $pu->delete();

        return response()->json(['message' => 'Polling unit deleted', 'action' => 'deleted']);
    }
}
