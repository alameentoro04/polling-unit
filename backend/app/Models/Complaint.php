<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Complaint extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_id', 'submitted_by', 'polling_unit_id', 'ward_id', 'lga_id',
        'complainant_type', 'complainant_name', 'complainant_phone',
        'complaint_text', 'status', 'submitted_at',
    ];

    protected $casts = [
        'submitted_at' => 'datetime',
    ];

    public function submittedBy()
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function pollingUnit()
    {
        return $this->belongsTo(PollingUnit::class);
    }

    public function ward()
    {
        return $this->belongsTo(Ward::class);
    }

    public function lga()
    {
        return $this->belongsTo(Lga::class);
    }
}
