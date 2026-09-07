<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\State;
use App\Models\Lga;
use App\Models\Ward;
use App\Models\PollingUnit;


class BauchiDataSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('seeders/data/bauchi_polling_units.json');

        if (!file_exists($path)) {
            throw new \RuntimeException(
                "Bauchi dataset not found at {$path}. Run the data build script or restore the JSON file before seeding."
            );
        }

        $payload = json_decode(file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);

        $state = State::firstOrCreate(
            ['name' => $payload['state']],
            ['code' => $payload['state_code'] ?? 'BA']
        );

        DB::transaction(function () use ($payload, $state) {
            $lgaIndex = 0;

            foreach ($payload['lgas'] as $lgaData) {
                $lgaIndex++;

                $lga = Lga::create([
                    'state_id' => $state->id,
                    'name' => $lgaData['name'],
                    'code' => 'BA-' . str_pad($lgaIndex, 2, '0', STR_PAD_LEFT),
                ]);

                $wardIndex = 0;

                foreach ($lgaData['wards'] as $wardData) {
                    $wardIndex++;

                    $ward = Ward::create([
                        'lga_id' => $lga->id,
                        'name' => $wardData['name'],
                        'code' => $lga->code . '-WD' . str_pad($wardIndex, 2, '0', STR_PAD_LEFT),
                    ]);

                    $rows = [];
                    foreach ($wardData['polling_units'] as $pu) {
                        $rows[] = [
                            'ward_id' => $ward->id,
                            'code' => $pu['code'],
                            'name' => $pu['name'],
                            'location' => $pu['name'],
                            'latitude' => $pu['latitude'],
                            'longitude' => $pu['longitude'],
                            'is_location_precise' => $pu['precise_location'] ?? false,
                            'target_count' => 10,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                    }

                    // Bulk insert per ward (a handful of units at a time) instead of
                    // one insert per polling unit — this seeder creates ~4,000 rows.
                    foreach (array_chunk($rows, 200) as $chunk) {
                        PollingUnit::insert($chunk);
                    }
                }
            }
        });
    }
}
