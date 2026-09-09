<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Registration;
use App\Models\User;
use App\Models\Lga;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    public function genderBreakdown(Request $request)
    {
        $scope = $request->attributes->get('data_scope');
        $query = Registration::query()->active();
        $this->applyScope($query, $scope);

        $data = $query->select('gender', DB::raw('COUNT(*) as count'))
            ->whereNotNull('gender')
            ->groupBy('gender')
            ->get();

        return response()->json($data);
    }

    public function ageDistribution(Request $request)
    {
        $scope = $request->attributes->get('data_scope');
        $query = Registration::query()->active()->whereNotNull('date_of_birth');
        $this->applyScope($query, $scope);

        $now = now();
        $ranges = [
            ['label' => '18-25', 'min' => 18, 'max' => 25],
            ['label' => '26-35', 'min' => 26, 'max' => 35],
            ['label' => '36-45', 'min' => 36, 'max' => 45],
            ['label' => '46-60', 'min' => 46, 'max' => 60],
            ['label' => '60+', 'min' => 60, 'max' => 200],
        ];

        $results = [];
        foreach ($ranges as $range) {
            $minDate = $now->copy()->subYears($range['max'] + 1)->addDay()->format('Y-m-d');
            $maxDate = $now->copy()->subYears($range['min'])->format('Y-m-d');
            $count = (clone $query)->whereBetween('date_of_birth', [$minDate, $maxDate])->count();
            $results[] = ['label' => $range['label'], 'count' => $count];
        }

        return response()->json($results);
    }

    public function hourlyHeatmap(Request $request)
    {
        $scope = $request->attributes->get('data_scope');
        $date = $request->input('date', now()->format('Y-m-d'));

        $query = Registration::query()->active()
            ->whereDate('registered_at', $date);
        $this->applyScope($query, $scope);

        $data = $query->select(DB::raw('HOUR(registered_at) as hour'), DB::raw('COUNT(*) as count'))
            ->groupBy('hour')
            ->orderBy('hour')
            ->get()
            ->keyBy('hour');

        $result = [];
        for ($h = 0; $h < 24; $h++) {
            $result[] = [
                'hour' => sprintf('%02d:00', $h),
                'count' => $data[$h]->count ?? 0,
            ];
        }

        return response()->json($result);
    }

    public function agentTrends(Request $request)
    {
        $days = $request->input('days', 7);
        $scope = $request->attributes->get('data_scope');

        $query = Registration::query()->active()
            ->selectRaw('DATE(registered_at) as date, registered_by, COUNT(*) as count')
            ->where('registered_at', '>=', now()->subDays($days))
            ->groupBy('date', 'registered_by')
            ->orderBy('date');

        $this->applyScope($query, $scope);

        $data = $query->get();
        $dates = collect(range(0, $days - 1))->map(fn($d) => now()->subDays($d)->format('Y-m-d'))->reverse()->values();
        $totalsByAgent = $data->groupBy('registered_by')->map->sum('count');
        $topAgentIds = $totalsByAgent->sortDesc()->keys()->take(15);

        $agents = User::whereIn('id', $topAgentIds)->pluck('full_name', 'id');

        $result = $agents->map(function ($name, $agentId) use ($data, $dates, $totalsByAgent) {
            $agentData = $data->where('registered_by', $agentId)->keyBy('date');
            return [
                'agent_id' => $agentId,
                'agent_name' => $name,
                'daily' => $dates->map(fn($date) => [
                    'date' => $date,
                    'count' => $agentData[$date]->count ?? 0,
                ])->toArray(),
                'total' => $totalsByAgent[$agentId] ?? 0,
            ];
        })->values()->sortByDesc('total')->values();

        return response()->json([
            'dates' => $dates,
            'agents' => $result,
        ]);
    }

    public function lgaRankings(Request $request)
    {
        $scope = $request->attributes->get('data_scope');

        $lgas = Lga::withCount(['registrations as registered_count' => function ($q) {
            $q->active();
        }])->withCount('pollingUnits as pu_count')->get()->map(function ($lga) {
            $target = $lga->pu_count * Setting::get('target_per_pu', 10);
            return [
                'id' => $lga->id,
                'name' => $lga->name,
                'registered' => $lga->registered_count,
                'target' => $target,
                'completion' => $target > 0 ? round(($lga->registered_count / $target) * 100, 2) : 0,
                'pu_count' => $lga->pu_count,
            ];
        })->sortByDesc('completion')->values();

        if ($scope['type'] === 'lga') {
            $lgas = $lgas->where('id', $scope['lga_id'])->values();
        }

        return response()->json($lgas);
    }

    public function summaryKpi(Request $request)
    {
        $scope = $request->attributes->get('data_scope');
        $query = Registration::query()->active();
        $this->applyScope($query, $scope);

        $total = $query->count();
        $today = (clone $query)->whereDate('registered_at', today())->count();
        $yesterday = (clone $query)->whereDate('registered_at', today()->subDay())->count();
        $thisWeek = (clone $query)->whereBetween('registered_at', [now()->startOfWeek(), now()->endOfWeek()])->count();

        $topAgent = User::whereHas('role', fn($q) => $q->where('name', 'agent'))
            ->withCount(['registrations as count' => fn($q) => $q->active()->whereDate('registered_at', today())])
            ->orderByDesc('count')
            ->first();

        $topAgent = ($topAgent && $topAgent->count > 0) ? $topAgent : null;

        return response()->json([
            'total_registrations' => $total,
            'today' => $today,
            'yesterday' => $yesterday,
            'this_week' => $thisWeek,
            'day_over_day_change' => $yesterday > 0 ? round((($today - $yesterday) / $yesterday) * 100, 1) : 0,
            'top_agent_today' => $topAgent ? ['name' => $topAgent->full_name, 'count' => $topAgent->count] : null,
        ]);
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
