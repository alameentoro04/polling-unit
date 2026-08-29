<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\State;
use App\Models\Lga;
use App\Models\Ward;
use App\Models\PollingUnit;

class BauchiDataSeeder extends Seeder
{
    public function run(): void
    {
        $state = State::create([
            'name' => 'Bauchi',
            'code' => 'BA'
        ]);

        $lgas = [
            ['name' => 'Bauchi', 'code' => 'BA-01'],
            ['name' => 'Tafawa Balewa', 'code' => 'BA-02'],
            ['name' => 'Dass', 'code' => 'BA-03'],
            ['name' => 'Toro', 'code' => 'BA-04'],
            ['name' => 'Bogoro', 'code' => 'BA-05'],
            ['name' => 'Ningi', 'code' => 'BA-06'],
            ['name' => 'Warji', 'code' => 'BA-07'],
            ['name' => 'Ganjuwa', 'code' => 'BA-08'],
            ['name' => 'Kirfi', 'code' => 'BA-09'],
            ['name' => 'Alkaleri', 'code' => 'BA-10'],
            ['name' => 'Darazo', 'code' => 'BA-11'],
            ['name' => 'Misau', 'code' => 'BA-12'],
        ];

        foreach ($lgas as $lgaData) {
            $lga = Lga::create(array_merge(
                $lgaData,
                ['state_id' => $state->id]
            ));

            $wardCount = rand(8, 12);

            for ($w = 1; $w <= $wardCount; $w++) {
                $ward = Ward::create([
                    'lga_id' => $lga->id,
                    'name' => "Ward {$w}",
                    'code' => "{$lgaData['code']}-WD" . str_pad(
                        $w,
                        2,
                        '0',
                        STR_PAD_LEFT
                    ),
                ]);

                $puCount = rand(8, 15);

                for ($p = 1; $p <= $puCount; $p++) {
                    PollingUnit::create([
                        'ward_id' => $ward->id,
                        'code' => "{$ward->code}-PU" . str_pad(
                            $p,
                            3,
                            '0',
                            STR_PAD_LEFT
                        ),
                        'name' => "Polling Unit {$p}",
                        'location' => "Location {$p}, {$ward->name}, {$lga->name}",
                        'latitude' => $this->randomLat(),
                        'longitude' => $this->randomLng(),
                        'target_count' => 10,
                    ]);
                }
            }
        }
    }

    private function randomLat(): float
    {
        // Bauchi approximate lat range: 9.5 to 11.5
        return round(
            9.5 + mt_rand() / mt_getrandmax() * 2.0,
            6
        );
    }

    private function randomLng(): float
    {
        // Bauchi approximate lng range: 9.5 to 11.0
        return round(
            9.5 + mt_rand() / mt_getrandmax() * 1.5,
            6
        );
    }
}