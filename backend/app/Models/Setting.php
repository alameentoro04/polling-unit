<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    use HasFactory;

    protected $fillable = ['key', 'value', 'type', 'group', 'label'];

    public static function get(string $key, $default = null)
    {
        return Cache::remember("setting.{$key}", 3600, function () use ($key, $default) {
            $setting = self::where('key', $key)->first();
            if (!$setting) return $default;
            return match ($setting->type) {
                'number' => (float) $setting->value,
                'boolean' => filter_var($setting->value, FILTER_VALIDATE_BOOLEAN),
                default => $setting->value,
            };
        });
    }

    public static function set(string $key, $value): void
    {
        self::updateOrCreate(['key' => $key], ['value' => (string) $value]);
        Cache::forget("setting.{$key}");
    }

    public static function allGrouped()
    {
        return Cache::remember('settings.all_grouped', 3600, function () {
            return self::orderBy('sort_order', 'asc')
                ->orderBy('id', 'asc')
                ->get()
                ->groupBy('group');
        });
    }

    protected static function booted(): void
    {
        static::saved(fn() => Cache::forget('settings.all_grouped'));
        static::deleted(fn() => Cache::forget('settings.all_grouped'));
    }
}
