<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            ['key' => 'app_name', 'value' => 'PU Monitoring System', 'type' => 'text', 'group' => 'branding', 'label' => 'Application Name'],
            ['key' => 'primary_color', 'value' => '#1a5f2a', 'type' => 'color', 'group' => 'branding', 'label' => 'Primary Color'],
            ['key' => 'logo_url', 'value' => '', 'type' => 'image', 'group' => 'branding', 'label' => 'Logo URL'],
            ['key' => 'target_per_pu', 'value' => '10', 'type' => 'number', 'group' => 'registration', 'label' => 'Target Registrations Per Polling Unit'],
            ['key' => 'allow_photo_capture', 'value' => 'true', 'type' => 'boolean', 'group' => 'registration', 'label' => 'Allow Photo Capture'],
            ['key' => 'require_phone', 'value' => 'false', 'type' => 'boolean', 'group' => 'registration', 'label' => 'Require Phone Number'],
            ['key' => 'require_dob', 'value' => 'false', 'type' => 'boolean', 'group' => 'registration', 'label' => 'Require Date of Birth'],
            ['key' => 'session_timeout', 'value' => '120', 'type' => 'number', 'group' => 'system', 'label' => 'Session Timeout (minutes)'],
        ];

        foreach ($settings as $s) {
            Setting::updateOrCreate(['key' => $s['key']], $s);
        }
    }
}
