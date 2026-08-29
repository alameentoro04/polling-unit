<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PollingUnit extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'code', 'ward_id', 'lga_id',
        'latitude', 'longitude', 'voter_count', 'target'
    ];

    public function ward()
    {
        return $this->belongsTo(Ward::class);
    }

    public function lga()
    {
        return $this->belongsTo(Lga::class);
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
