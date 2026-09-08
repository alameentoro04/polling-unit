<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Registration;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class RegistrationController extends Controller
{
    public function agentDashboard(Request $request): JsonResponse
    {
        $agent = $request->user();

        if (!$agent instanceof User) {
            abort(401, 'Unauthenticated.');
        }

        $puId = $request->attributes->get('agent_polling_unit_id');
        $pu = \App\Models\PollingUnit::with('ward.lga')->find($puId);

        $registered = Registration::where('registered_by', $agent->id)
            ->active()
            ->count();

        $target = $pu->target_count ?? 10;
        $completion = $target > 0 ? round(($registered / $target) * 100, 2) : 0;

        $pending = Registration::where('registered_by', $agent->id)
            ->where('sync_status', 'pending')
            ->count();

        $synced = Registration::where('registered_by', $agent->id)
            ->where('sync_status', 'synced')
            ->count();

        $conflicts = Registration::where('registered_by', $agent->id)
            ->where('sync_status', 'conflict')
            ->count();

        return response()->json([
            'polling_unit' => [
                'name' => $pu->name,
                'code' => $pu->code,
                'ward' => $pu->ward?->name,
                'lga' => $pu->ward?->lga?->name,
            ],
            'progress' => [
                'target' => $target,
                'registered' => $registered,
                'completion' => $completion,
            ],
            'sync' => [
                'pending' => $pending,
                'synced' => $synced,
                'conflicts' => $conflicts,
            ],
        ]);
    }

    public function myRecords(Request $request): JsonResponse
    {
        $agent = $request->user();

        if (!$agent instanceof User) {
            abort(401, 'Unauthenticated.');
        }

        $records = Registration::query()
            ->where('registered_by', $agent->id)
            ->active()
            ->latest('registered_at')
            ->paginate(20);

        return response()->json($records);
    }

    public function checkPvc(Request $request)
    {
        $pvc = strtoupper(trim($request->input('pvc', '')));
        if (strlen($pvc) < 5) {
            return response()->json(['exists' => false]);
        }

        $exists = Registration::whereRaw('LOWER(pvc_number) = ?', [strtolower($pvc)])
            ->where('is_deleted', false)
            ->exists();

        return response()->json(['exists' => $exists]);
    }

    public function storeOffline(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'client_id' => 'required|string|max:64',
            'pvc_number' => 'required|string|max:20',
            'full_name' => 'required|string|max:255',
            'phone_number' => 'nullable|string|max:20',
            'date_of_birth' => 'nullable|date',
            'gender' => 'nullable|in:male,female,other',
            'photograph_url' => 'nullable|string',
            'registered_at' => 'nullable|date',
            'gps_latitude' => 'nullable|numeric',
            'gps_longitude' => 'nullable|numeric',
            'gps_accuracy' => 'nullable|numeric',
            'dynamic_data' => 'nullable]array',

        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $agent = auth()->user();
        $puId = $request->attributes->get('agent_polling_unit_id');
        $pu = \App\Models\PollingUnit::find($puId);

        $registration = Registration::create([
            'client_id' => $request->client_id,
            'pvc_number' => strtoupper(trim($request->pvc_number)),
            'full_name' => $request->full_name,
            'phone_number' => $request->phone_number,
            'date_of_birth' => $request->date_of_birth,
            'gender' => $request->gender,
            'photograph_url' => $request->photograph_url,
            'polling_unit_id' => $pu->id,
            'ward_id' => $pu->ward_id,
            'lga_id' => $pu->ward->lga_id,
            'registered_by' => $agent->id,
            'registered_at' => $request->registered_at ?? now(),
            'sync_status' => 'pending',
            'gps_latitude' => $request->gps_latitude,
            'gps_longitude' => $request->gps_longitude,
            'gps_accuracy' => $request->gps_accuracy,
            'dynamic_data' => $request->dynamic_data,

        ]);

        return response()->json([
            'status' => 'stored_locally',
            'client_id' => $registration->client_id,
        ]);
    }

    public function index(Request $request)
    {
        $scope = $request->attributes->get('data_scope');
        $query = Registration::query()->active()->with(['pollingUnit', 'ward', 'lga', 'registeredBy']);

        $this->applyScope($query, $scope);

 
        if ($request->filled('lga_id')) $query->where('lga_id', $request->lga_id);
        if ($request->filled('ward_id')) $query->where('ward_id', $request->ward_id);
        if ($request->filled('polling_unit_id')) $query->where('polling_unit_id', $request->polling_unit_id);
        if ($request->filled('agent_id')) $query->where('registered_by', $request->agent_id);
        if ($request->filled('date_from')) $query->whereDate('registered_at', '>=', $request->date_from);
        if ($request->filled('date_to')) $query->whereDate('registered_at', '<=', $request->date_to);

        return response()->json($query->orderBy('registered_at', 'desc')->paginate(50));
    }

    public function show(Request $request, $id)
    {
        $scope = $request->attributes->get('data_scope');
        $registration = Registration::with(['pollingUnit', 'ward', 'lga', 'registeredBy'])->findOrFail($id);

        if (!$this->canAccess($registration, $scope)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json($registration);
    }

    public function search(Request $request)
    {
        $scope = $request->attributes->get('data_scope');
        $q = $request->input('q');

        $query = Registration::query()->active();

        $this->applyScope($query, $scope);

        $query->where(function ($sub) use ($q) {
            $sub->whereRaw('LOWER(pvc_number) LIKE ?', ['%' . strtolower($q) . '%'])
                ->orWhereRaw('LOWER(full_name) LIKE ?', ['%' . strtolower($q) . '%'])
                ->orWhereRaw('LOWER(phone_number) LIKE ?', ['%' . strtolower($q) . '%']);
        });

        return response()->json($query->limit(20)->get());
    }

    public function update(Request $request, $id)
    {
        $registration = Registration::findOrFail($id);
        $before = $registration->toArray();

        $validator = Validator::make($request->all(), [
            'full_name' => 'sometimes|string|max:255',
            'phone_number' => 'nullable|string|max:20',
            'date_of_birth' => 'nullable|date',
            'gender' => 'nullable|in:male,female,other',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $registration->update($request->only(['full_name', 'phone_number', 'date_of_birth', 'gender']));
        AuditService::logRegistrationUpdated($registration, $before, $registration->fresh()->toArray(), auth()->id());

        return response()->json($registration);
    }

    public function softDelete(Request $request, $id)
    {
        $registration = Registration::findOrFail($id);

        $registration->update([
            'is_deleted' => true,
            'deleted_by' => auth()->id(),
            'deleted_at' => now(),
        ]);

        AuditService::logRegistrationDeleted($registration, auth()->id());

        return response()->json(['message' => 'Registration deleted']);
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

    private function canAccess(Registration $reg, array $scope): bool
    {
        return match ($scope['type'] ?? 'all') {
            'all' => true,
            'lga' => $reg->lga_id == ($scope['lga_id'] ?? null),
            'ward' => $reg->ward_id == ($scope['ward_id'] ?? null),
            'agent' => $reg->registered_by == ($scope['registered_by'] ?? null),
            default => false,
        };
    }
}
