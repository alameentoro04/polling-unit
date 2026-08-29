<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class SettingsController extends Controller
{
    public function index()
    {
        $settings = Setting::orderBy('group')->orderBy('id')->get();
        return response()->json($settings->groupBy('group'));
    }

    public function publicSettings()
    {
        $keys = ['app_name', 'primary_color', 'logo_url', 'target_per_pu'];
        $settings = [];
        foreach ($keys as $key) {
            $settings[$key] = Setting::get($key);
        }
        return response()->json($settings);
    }

    public function update(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'settings' => 'required|array',
            'settings.*.key' => 'required|string',
            'settings.*.value' => 'nullable',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        foreach ($request->input('settings') as $item) {
            Setting::set($item['key'], $item['value'] ?? '');
        }

        return response()->json(['message' => 'Settings updated']);
    }

    public function uploadLogo(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'logo' => 'required|image|max:2048',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $path = $request->file('logo')->store('logos', 'public');
        Setting::set('logo_url', url('storage/' . $path));

        return response()->json(['logo_url' => url('storage/' . $path)]);
    }

    public function resetDefaults()
    {
        $defaults = [
            ['key' => 'app_name', 'value' => 'PU Monitoring System', 'type' => 'text', 'group' => 'branding', 'label' => 'Application Name'],
            ['key' => 'primary_color', 'value' => '#1a5f2a', 'type' => 'color', 'group' => 'branding', 'label' => 'Primary Color'],
            ['key' => 'logo_url', 'value' => '', 'type' => 'image', 'group' => 'branding', 'label' => 'Logo URL'],
            ['key' => 'target_per_pu', 'value' => '10', 'type' => 'number', 'group' => 'registration', 'label' => 'Target Registrations Per Polling Unit'],
            ['key' => 'allow_photo_capture', 'value' => 'true', 'type' => 'boolean', 'group' => 'registration', 'label' => 'Allow Photo Capture'],
            ['key' => 'require_phone', 'value' => 'false', 'type' => 'boolean', 'group' => 'registration', 'label' => 'Require Phone Number'],
            ['key' => 'require_dob', 'value' => 'false', 'type' => 'boolean', 'group' => 'registration', 'label' => 'Require Date of Birth'],
            ['key' => 'session_timeout', 'value' => '120', 'type' => 'number', 'group' => 'system', 'label' => 'Session Timeout (minutes)'],
        ];

        foreach ($defaults as $d) {
            Setting::updateOrCreate(['key' => $d['key']], $d);
        }

        return response()->json(['message' => 'Defaults restored']);
    }
}
