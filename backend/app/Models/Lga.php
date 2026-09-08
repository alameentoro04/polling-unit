<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Lga extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'code', 'state_id'];

    public function state()
    {
        return $this->belongsTo(State::class);
    }

    public function wards()
    {
        return $this->hasMany(Ward::class);
    }

    public function pollingUnits()
    {
        return $this->hasManyThrough(PollingUnit::class, Ward::class, 'lga_id', 'ward_id');
    }

    public function registrations()
    {
        return $this->hasMany(Registration::class);
    }
}
