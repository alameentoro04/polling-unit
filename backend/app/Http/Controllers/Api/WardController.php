<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PollingUnit;
use App\Models\Ward;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class WardController extends Controller
{
    public function index(Request $request)
    {
        $scope = $request->attributes->get('data_scope');

        $query = Ward::query()
            ->with('lga')
            ->withCount('pollingUnits');

        switch ($scope['type'] ?? 'all') {
            case 'lga':
                if (!empty($scope['lga_id'])) {
                    $query->where('lga_id', $scope['lga_id']);
                }
                break;
            case 'ward':
                if (!empty($scope['ward_id'])) {
                    $query->where('id', $scope['ward_id']);
                }
                break;
        }

        if ($request->filled('lga_id')) {
            $query->where('lga_id', $request->lga_id);
        }
        if ($request->filled('q')) {
            $q = strtolower($request->input('q'));
            $query->whereRaw('LOWER(name) LIKE ?', ["%{$q}%"]);
        }

        return response()->json($query->orderBy('name')->paginate(50));
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'lga_id' => 'required|exists:lgas,id',
            'name' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $lga = \App\Models\Lga::findOrFail($request->lga_id);
        $count = Ward::where('lga_id', $lga->id)->count();
        $code = $lga->code . '-WD' . str_pad($count + 1, 2, '0', STR_PAD_LEFT);

        $ward = Ward::create([
            'lga_id' => $lga->id,
            'name' => trim($request->name),
            'code' => $code,
        ]);

        AuditService::log('WARD_CREATED', 'ward', (string) $ward->id, null, $ward->toArray(), auth()->id());

        return response()->json($ward->load('lga'), 201);
    }

    public function update(Request $request, $id)
    {
        $ward = Ward::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'lga_id' => 'sometimes|required|exists:lgas,id',
            'name' => 'sometimes|required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $before = $ward->toArray();
        $ward->update($request->only(['lga_id', 'name']));
        AuditService::log('WARD_UPDATED', 'ward', (string) $ward->id, $before, $ward->fresh()->toArray(), auth()->id());

        return response()->json($ward->fresh()->load('lga'));
    }

    public function destroy($id)
    {
        $ward = Ward::findOrFail($id);

        if (PollingUnit::where('ward_id', $id)->exists()) {
            return response()->json([
                'message' => 'This ward still has polling units in it. Reassign or delete them first.',
            ], 422);
        }

        AuditService::log('WARD_DELETED', 'ward', (string) $ward->id, $ward->toArray(), null, auth()->id());
        $ward->delete();

        return response()->json(['message' => 'Ward deleted']);
    }
}
