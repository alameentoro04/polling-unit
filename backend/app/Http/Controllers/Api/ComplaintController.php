<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Complaint;
use App\Models\PollingUnit;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ComplaintController extends Controller
{
    public function sync(Request $request)
    {
        $agent = $request->user();
        $complaints = $request->input('complaints', []);
        $results = [];

        foreach ($complaints as $payload) {
            $clientId = $payload['client_id'] ?? null;
            if (!$clientId) {
                $results[] = ['client_id' => $clientId, 'status' => 'failed', 'message' => 'Missing client_id'];
                continue;
            }

            $existing = Complaint::where('client_id', $clientId)->first();
            if ($existing) {
                $results[] = ['client_id' => $clientId, 'status' => 'already_synced'];
                continue;
            }

            $validator = Validator::make($payload, [
                'complaint_text' => 'required|string',
                'complainant_type' => 'required|in:agent,voter',
                'complainant_name' => 'nullable|string|max:255',
                'complainant_phone' => 'nullable|string|max:20',
                'polling_unit_id' => 'nullable|exists:polling_units,id',
            ]);

            if ($validator->fails()) {
                $results[] = ['client_id' => $clientId, 'status' => 'failed', 'errors' => $validator->errors()];
                continue;
            }
            $assignment = $agent->currentAssignment();
            $pollingUnit = $assignment?->pollingUnit;
            if (!empty($payload['polling_unit_id'])) {
                $chosen = PollingUnit::with('ward')->find($payload['polling_unit_id']);
                if ($chosen) {
                    $pollingUnit = $chosen;
                }
            }

            if (!$pollingUnit) {
                $results[] = ['client_id' => $clientId, 'status' => 'failed', 'message' => 'No polling unit available for this complaint'];
                continue;
            }

            $complaint = Complaint::create([
                'client_id' => $clientId,
                'submitted_by' => $agent->id,
                'polling_unit_id' => $pollingUnit->id,
                'ward_id' => $pollingUnit->ward_id,
                'lga_id' => $pollingUnit->ward->lga_id,
                'complainant_type' => $payload['complainant_type'],
                'complainant_name' => $payload['complainant_name'] ?? null,
                'complainant_phone' => $payload['complainant_phone'] ?? null,
                'complaint_text' => $payload['complaint_text'],
                'status' => 'open',
                'submitted_at' => $payload['submitted_at'] ?? now(),
            ]);

            AuditService::log('COMPLAINT_SUBMITTED', 'complaint', (string) $complaint->id, null, $complaint->toArray(), $agent->id);

            $results[] = ['client_id' => $clientId, 'status' => 'synced', 'id' => $complaint->id];
        }

        return response()->json(['results' => $results]);
    }

    public function index(Request $request)
    {
        $scope = $request->attributes->get('data_scope');

        $query = Complaint::with(['submittedBy', 'pollingUnit', 'ward', 'lga'])
            ->orderByDesc('submitted_at');

        switch ($scope['type'] ?? 'all') {
            case 'lga':
                if (!empty($scope['lga_id'])) $query->where('lga_id', $scope['lga_id']);
                break;
            case 'ward':
                if (!empty($scope['ward_id'])) $query->where('ward_id', $scope['ward_id']);
                break;
            case 'agent':
                if (!empty($scope['registered_by'])) $query->where('submitted_by', $scope['registered_by']);
                break;
        }

        if ($request->filled('status')) $query->where('status', $request->status);
        if ($request->filled('lga_id')) $query->where('lga_id', $request->lga_id);
        if ($request->filled('ward_id')) $query->where('ward_id', $request->ward_id);
        if ($request->filled('polling_unit_id')) $query->where('polling_unit_id', $request->polling_unit_id);
        if ($request->filled('date_from')) $query->whereDate('submitted_at', '>=', $request->date_from);
        if ($request->filled('date_to')) $query->whereDate('submitted_at', '<=', $request->date_to);
        if ($request->filled('q')) {
            $q = strtolower($request->input('q'));
            $query->where(function ($sub) use ($q) {
                $sub->whereRaw('LOWER(complaint_text) LIKE ?', ["%{$q}%"])
                    ->orWhereRaw('LOWER(complainant_name) LIKE ?', ["%{$q}%"]);
            });
        }

        return response()->json($query->paginate(30));
    }

    public function updateStatus(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|in:open,reviewed,resolved',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $complaint = Complaint::findOrFail($id);

        $scope = $request->attributes->get('data_scope');
        $type = $scope['type'] ?? 'all';
        if ($type === 'lga' && (int) $complaint->lga_id !== (int) ($scope['lga_id'] ?? 0)) {
            abort(403, 'Outside your assigned LGA.');
        }
        if ($type === 'ward' && (int) $complaint->ward_id !== (int) ($scope['ward_id'] ?? 0)) {
            abort(403, 'Outside your assigned ward.');
        }

        $before = $complaint->toArray();
        $complaint->update(['status' => $request->status]);

        AuditService::log('COMPLAINT_STATUS_UPDATED', 'complaint', (string) $complaint->id, $before, $complaint->fresh()->toArray(), auth()->id());

        return response()->json($complaint->fresh());
    }
}
