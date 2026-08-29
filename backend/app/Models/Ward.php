<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Ward extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'code', 'lga_id'];

    public function lga()
    {
        return $this->belongsTo(Lga::class);
    }

    public function pollingUnits()
    {
        return $this->hasMany(PollingUnit::class);
    }

    public function registrations()
    {
        return $this->hasMany(Registration::class);
    }
}
