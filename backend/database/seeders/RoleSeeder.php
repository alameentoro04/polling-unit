<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            [
                'name' => 'admin',
                'permissions' => [
                    'users.create', 'users.edit', 'users.delete',
                    'lgas.view_all', 'wards.view_all', 'pus.view_all',
                    'registrations.view_all', 'registrations.edit', 'registrations.delete',
                    'agents.assign', 'agents.reassign',
                    'audit.view', 'export', 'import',
                    'dashboard.full', 'maps.view'
                ]
            ],
            [
                'name' => 'lga_coordinator',
                'permissions' => [
                    'lgas.view_own', 'wards.view_own', 'pus.view_own',
                    'registrations.view_own_lga',
                    'dashboard.lga', 'charts.view'
                ]
            ],
            [
                'name' => 'ward_coordinator',
                'permissions' => [
                    'wards.view_own', 'pus.view_own',
                    'registrations.view_own_ward',
                    'dashboard.ward', 'charts.view'
                ]
            ],
            [
                'name' => 'agent',
                'permissions' => [
                    'registrations.create', 'registrations.view_own',
                    'dashboard.agent', 'sync'
                ]
            ],
        ];

        foreach ($roles as $role) {
            Role::create($role);
        }

        // Create default admin
        User::create([
            'role_id' => Role::where('name', 'admin')->first()->id,
            'username' => 'admin',
            'password_hash' => Hash::make('admin123'),
            'full_name' => 'System Administrator',
            'email' => 'admin@bauchi.gov.ng',
            'phone' => '08000000000',
            'is_active' => true,
        ]);
    }
}
