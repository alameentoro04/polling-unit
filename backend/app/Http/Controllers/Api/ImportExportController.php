<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lga;
use App\Models\Ward;
use App\Models\PollingUnit;
use App\Models\Registration;
use App\Models\ExportJob;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class ImportExportController extends Controller
{
    public function importPollingUnits(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:xlsx,xls,csv|max:10240',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $file = $request->file('file');
        $extension = $file->getClientOriginalExtension();

        $data = $this->readExcel($file, $extension);

        if (empty($data)) {
            return response()->json(['message' => 'Could not read file or file is empty'], 422);
        }

        $results = [
            'total_rows' => count($data),
            'valid_rows' => 0,
            'invalid_rows' => 0,
            'duplicates' => 0,
            'missing_fields' => 0,
            'imported_rows' => 0,
            'errors' => [],
        ];

        DB::beginTransaction();

        try {
            foreach ($data as $index => $row) {
                $rowNum = $index + 2; // +2 for header row

                $required = ['lga', 'ward', 'polling_unit_code', 'polling_unit_name'];
                $missing = [];
                foreach ($required as $field) {
                    if (empty($row[$field] ?? null)) {
                        $missing[] = $field;
                    }
                }

                if (!empty($missing)) {
                    $results['invalid_rows']++;
                    $results['missing_fields']++;
                    $results['errors'][] = "Row {$rowNum}: Missing fields: " . implode(', ', $missing);
                    continue;
                }

                $existing = PollingUnit::where('code', $row['polling_unit_code'])->first();
                if ($existing) {
                    $results['invalid_rows']++;
                    $results['duplicates']++;
                    $results['errors'][] = "Row {$rowNum}: Duplicate polling unit code '{$row['polling_unit_code']}'";
                    continue;
                }

                $lga = Lga::firstOrCreate(
                    ['name' => trim($row['lga'])],
                    ['state_id' => 1, 'code' => $this->generateLgaCode()]
                );

                $ward = Ward::firstOrCreate(
                    ['name' => trim($row['ward']), 'lga_id' => $lga->id],
                    ['code' => $lga->code . '-WD' . str_pad(Ward::where('lga_id', $lga->id)->count() + 1, 2, '0', STR_PAD_LEFT)]
                );

                PollingUnit::create([
                    'ward_id' => $ward->id,
                    'code' => trim($row['polling_unit_code']),
                    'name' => trim($row['polling_unit_name']),
                    'location' => trim($row['polling_unit_location'] ?? ''),
                    'latitude' => $row['latitude'] ?? null,
                    'longitude' => $row['longitude'] ?? null,
                    'target_count' => 10,
                ]);

                $results['valid_rows']++;
                $results['imported_rows']++;
            }

            DB::commit();

            AuditService::logExcelImported(
                $results['valid_rows'],
                $results['invalid_rows'],
                $results['imported_rows'],
                auth()->id()
            );

            return response()->json([
                'message' => 'Import completed',
                'results' => $results,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Import failed',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function exportRegistrations(Request $request)
    {
        $scope = $request->attributes->get('data_scope');

        $query = Registration::query()
            ->active()
            ->with(['pollingUnit', 'ward', 'lga', 'registeredBy']);

        if ($request->filled('lga_id')) $query->where('lga_id', $request->lga_id);
        if ($request->filled('ward_id')) $query->where('ward_id', $request->ward_id);
        if ($request->filled('polling_unit_id')) $query->where('polling_unit_id', $request->polling_unit_id);
        if ($request->filled('agent_id')) $query->where('registered_by', $request->agent_id);
        if ($request->filled('date_from')) $query->whereDate('registered_at', '>=', $request->date_from);
        if ($request->filled('date_to')) $query->whereDate('registered_at', '<=', $request->date_to);
        if ($request->filled('q')) {
            $q = strtolower($request->input('q'));
            $query->where(function ($sub) use ($q) {
                $sub->whereRaw('LOWER(pvc_number) LIKE ?', ["%{$q}%"])
                    ->orWhereRaw('LOWER(full_name) LIKE ?', ["%{$q}%"])
                    ->orWhereRaw('LOWER(phone_number) LIKE ?', ["%{$q}%"]);
            });
        }

        $this->applyScope($query, $scope);

        $registrations = $query->orderBy('registered_at', 'desc')->get();

        $filename = 'registrations_' . now()->format('Ymd_His') . '.csv';
        $filepath = 'exports/' . $filename;

        Storage::disk('public')->makeDirectory('exports');
        $csv = fopen(Storage::disk('public')->path($filepath), 'w');

        // Headers
        fputcsv($csv, [
            'ID', 'PVC Number', 'Full Name', 'Phone Number', 'Date of Birth', 'Gender',
            'Polling Unit', 'Ward', 'LGA', 'Agent', 'Registered At', 'Sync Status'
        ]);

        foreach ($registrations as $reg) {
            fputcsv($csv, [
                $reg->id,
                $reg->pvc_number,
                $reg->full_name,
                $reg->phone_number,
                $reg->date_of_birth,
                $reg->gender,
                $reg->pollingUnit?->name,
                $reg->ward?->name,
                $reg->lga?->name,
                $reg->registeredBy?->full_name,
                $reg->registered_at,
                $reg->sync_status,
            ]);
        }

        fclose($csv);

        AuditService::logExcelExported('registrations', $request->all(), auth()->id());

        return response()->json([
            'download_url' => url('storage/' . $filepath),
            'filename' => $filename,
            'record_count' => $registrations->count(),
        ]);
    }

    private function readExcel($file, $extension)
    {
        $path = $file->getRealPath();
        $data = [];

        if ($extension === 'csv') {
            $handle = fopen($path, 'r');
            $headers = fgetcsv($handle);
            if (!$headers) return [];

          
            $headers = array_map(function($h) {
                return strtolower(trim(str_replace(' ', '_', $h)));
            }, $headers);

            while (($row = fgetcsv($handle)) !== false) {
                if (count($row) === count($headers)) {
                    $data[] = array_combine($headers, $row);
                }
            }
            fclose($handle);
        } else {
            
            return response()->json([
                'message' => 'Please upload as CSV format. XLSX support requires phpoffice/phpspreadsheet package.'
            ], 422)->getData(true);
        }

        return $data;
    }

    private function generateLgaCode(): string
    {
        $count = Lga::count() + 1;
        return 'BA-' . str_pad($count, 2, '0', STR_PAD_LEFT);
    }

    private function applyScope($query, array $scope)
    {
        switch ($scope['type'] ?? 'all') {
            case 'lga': $query->where('lga_id', $scope['lga_id']); break;
            case 'ward': $query->where('ward_id', $scope['ward_id']); break;
            case 'agent': $query->where('registered_by', $scope['registered_by']); break;
        }
    }
}
