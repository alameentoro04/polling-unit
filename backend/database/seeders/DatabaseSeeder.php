<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Create roles and default admin
        $this->call(RoleSeeder::class);

        // 2. Import Bauchi states/LGAs/wards/polling units
        $this->call(BauchiDataSeeder::class);

        // 3. Create agents and assign them to polling units
        //    Also creates sample registrations
        $this->call(AgentSeeder::class);

        $this->call([SettingSeeder::class, FormFieldSeeder::class]);

    }
}