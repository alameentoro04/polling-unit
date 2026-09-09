<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PollingUnit extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'code', 'ward_id', 'location',
        'latitude', 'longitude', 'is_location_precise', 'target_count', 'is_active',
    ];

    protected $casts = [
        'latitude' => 'float',
        'longitude' => 'float',
        'is_location_precise' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function ward()
    {
        return $this->belongsTo(Ward::class);
    }

    public function registrations()
    {
        return $this->hasMany(Registration::class);
    }

    public function assignedAgent()
    {
        return $this->hasOne(User::class, 'assigned_polling_unit_id');
    }

    public function activeRegistrationsCount()
    {
        return $this->registrations()->whereNull('deleted_at')->count();
    }
}
