<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Role;
use App\Models\PollingUnit;
use App\Models\AgentAssignment;
use App\Models\Registration;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AgentSeeder extends Seeder
{
    public function run(): void
    {
        $agentRole = Role::where('name', 'agent')->first();
        $pollingUnits = PollingUnit::inRandomOrder()->limit(50)->get();
        $admin = User::where('username', 'admin')->first();

        foreach ($pollingUnits as $index => $pu) {
            $agent = User::create([
                'role_id' => $agentRole->id,
                'username' => 'agent' . ($index + 1),
                'password_hash' => Hash::make('agent123'),
                'full_name' => "Agent " . ($index + 1) . " {$pu->name}",
                'phone' => '080' . str_pad(rand(10000000, 99999999), 8, '0', STR_PAD_LEFT),
                'is_active' => true,
            ]);

            AgentAssignment::create([
                'user_id' => $agent->id,
                'polling_unit_id' => $pu->id,
                'assigned_by' => $admin->id,
                'assigned_at' => now()->subDays(rand(1, 30)),
                'is_current' => true,
            ]);

            // Create 3-15 sample registrations per agent
            $regCount = rand(3, 15);
            for ($r = 0; $r < $regCount; $r++) {
                Registration::create([
                    'client_id' => Str::uuid()->toString(),
                    'pvc_number' => $this->generatePvc(),
                    'full_name' => $this->randomName(),
                    'phone_number' => '080' . str_pad(rand(10000000, 99999999), 8, '0', STR_PAD_LEFT),
                    'date_of_birth' => now()->subYears(rand(18, 70))->subDays(rand(0, 365)),
                    'gender' => ['male', 'female'][rand(0, 1)],
                    'polling_unit_id' => $pu->id,
                    'ward_id' => $pu->ward_id,
                    'lga_id' => $pu->ward->lga_id,
                    'registered_by' => $agent->id,
                    'registered_at' => now()->subDays(rand(0, 20)),
                    'sync_status' => 'synced',
                ]);
            }
        }
    }

    private function generatePvc(): string
    {
        $letters = substr(str_shuffle('ABCDEFGHIJKLMNOPQRSTUVWXYZ'), 0, 2);
        $numbers = str_pad(rand(0, 99999999), 8, '0', STR_PAD_LEFT);
        return $letters . $numbers;
    }

    private function randomName(): string
    {
        $first = ['Abubakar', 'Fatima', 'Ibrahim', 'Aisha', 'Yusuf', 'Mariam', 'Musa', 'Halima', 'Suleiman', 'Zainab', 'Aliyu', 'Hauwa', 'Mohammed', 'Safiya', 'Umar', 'Nafisa', 'Isa', 'Khadija', 'Abdullahi', 'Rukayya'][rand(0, 19)];
        $last = ['Mohammed', 'Abubakar', 'Ibrahim', 'Yusuf', 'Suleiman', 'Aliyu', 'Umar', 'Isa', 'Abdullahi', 'Bello', 'Adamu', 'Musa', 'Sani', 'Lawal', 'Garba', 'Shehu', 'Idris', 'Haruna', 'Dauda', 'Salisu'][rand(0, 19)];
        return "{$first} {$last}";
    }
}
