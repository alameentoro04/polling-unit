<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Role;
use App\Models\AgentAssignment;
use App\Models\AuditLog;
use App\Models\PollingUnit;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AdminController extends Controller
{
    public function index(Request $request)
    {
        $query = User::with(['role', 'assignedPollingUnit.ward.lga', 'managedLga', 'managedWard'])->orderBy('created_at', 'desc');

        if ($request->filled('role')) {
            $query->whereHas('role', fn($q) => $q->where('name', $request->role));
        }

        return response()->json($query->paginate(50));
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'username' => 'required|string|unique:users',
            'password' => 'required|string|min:8',
            'full_name' => 'required|string|max:255',
            'email' => 'nullable|email',
            'phone' => 'nullable|string|max:20',
            'role' => 'required|string|in:admin,lga_coordinator,ward_coordinator,agent',
            'lga_id' => 'required_if:role,lga_coordinator|exists:lgas,id',
            'ward_id' => 'required_if:role,ward_coordinator|exists:wards,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $role = Role::where('name', $request->role)->firstOrFail();

        $user = User::create([
            'role_id' => $role->id,
            'username' => $request->username,
            'password_hash' => Hash::make($request->password),
            'full_name' => $request->full_name,
            'email' => $request->email,
            'phone' => $request->phone,
            'is_active' => true,
            'managed_lga_id' => $request->role === 'lga_coordinator' ? $request->lga_id : null,
            'managed_ward_id' => $request->role === 'ward_coordinator' ? $request->ward_id : null,
        ]);

        AuditService::logUserCreated($user, auth()->id());

        return response()->json($user, 201);
    }

    public function show($id)
    {
        $user = User::with(['role', 'managedLga', 'managedWard', 'agentAssignments.pollingUnit.ward.lga'])->findOrFail($id);
        return response()->json($user);
    }

    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $before = $user->toArray();

        $user->update($request->only(['full_name', 'email', 'phone', 'is_active']));
        AuditService::logUserUpdated($user, $before, $user->fresh()->toArray(), auth()->id());

        return response()->json($user);
    }

    public function assignScope(Request $request, $id)
    {
        $user = User::findOrFail($id);

        if (!$user->isLgaCoordinator() && !$user->isWardCoordinator()) {
            return response()->json(['message' => 'User is not a coordinator'], 400);
        }

        $before = $user->toArray();

        if ($user->isLgaCoordinator()) {
            $validator = Validator::make($request->all(), ['lga_id' => 'required|exists:lgas,id']);
            if ($validator->fails()) return response()->json(['errors' => $validator->errors()], 422);
            $user->update(['managed_lga_id' => $request->lga_id]);
        } else {
            $validator = Validator::make($request->all(), ['ward_id' => 'required|exists:wards,id']);
            if ($validator->fails()) return response()->json(['errors' => $validator->errors()], 422);
            $user->update(['managed_ward_id' => $request->ward_id]);
        }

        AuditService::logUserUpdated($user, $before, $user->fresh()->toArray(), auth()->id());

        return response()->json($user->fresh());
    }

    public function destroy($id)
    {
        $user = User::findOrFail($id);
        $user->update(['is_active' => false]);
        AuditService::logUserDeactivated($user, auth()->id());

        return response()->json(['message' => 'User deactivated (accounts are deactivated, not hard-deleted, to preserve historical records)']);
    }

    public function assignAgent(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $pu = PollingUnit::findOrFail($request->polling_unit_id);

        if (!$user->isAgent()) {
            return response()->json(['message' => 'User is not an agent'], 400);
        }

        AgentAssignment::where('polling_unit_id', $pu->id)
            ->where('is_current', true)
            ->update(['is_current' => false, 'unassigned_at' => now()]);

        $assignment = AgentAssignment::create([
            'user_id' => $user->id,
            'polling_unit_id' => $pu->id,
            'assigned_by' => auth()->id(),
            'assigned_at' => now(),
            'is_current' => true,
        ]);

        $user->update(['assigned_polling_unit_id' => $pu->id]);

        AuditService::logAgentAssigned($assignment, auth()->id());

        return response()->json($assignment, 201);
    }

    public function reassignAgent(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $oldAssignment = $user->currentAssignment();

        if ($oldAssignment) {
            $oldAssignment->update(['is_current' => false, 'unassigned_at' => now()]);
        }

        return $this->assignAgent($request, $id);
    }

    public function deactivate(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $user->update(['is_active' => false]);
        AuditService::logUserDeactivated($user, auth()->id());

        return response()->json(['message' => 'User deactivated']);
    }

    public function auditLogs(Request $request)
    {
        $query = AuditLog::with('actor')->orderBy('created_at', 'desc');

        if ($request->filled('action')) $query->where('action', $request->action);
        if ($request->filled('entity_type')) $query->where('entity_type', $request->entity_type);
        if ($request->filled('actor_id')) $query->where('actor_id', $request->actor_id);

        return response()->json($query->paginate(100));
    }
}
