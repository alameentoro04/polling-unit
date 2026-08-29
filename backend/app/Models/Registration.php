<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Registration extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_id', 'pvc_number', 'full_name', 'phone_number',
        'date_of_birth', 'gender', 'photograph_url',
        'polling_unit_id', 'ward_id', 'lga_id', 'registered_by',
        'registered_at', 'sync_status', 'sync_metadata',
        'is_deleted', 'deleted_by', 'deleted_at',
        'gps_latitude', 'gps_longitude', 'gps_accuracy', 'dynamic_data'

    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'registered_at' => 'datetime',
        'deleted_at' => 'datetime',
        'is_deleted' => 'boolean',
        'sync_metadata' => 'array',
        'dynamic_data' => 'array',
    ];

    public function pollingUnit(): BelongsTo
    {
        return $this->belongsTo(PollingUnit::class);
    }

    public function ward(): BelongsTo
    {
        return $this->belongsTo(Ward::class);
    }

    public function lga(): BelongsTo
    {
        return $this->belongsTo(Lga::class);
    }

    public function state()
{
    return $this->belongsTo(State::class);
}


    public function registeredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registered_by');
    }

    public function deletedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }

    public function scopeActive($query)
    {
        return $query->whereNull('deleted_at');
    }

    public function scopeSynced($query)
    {
        return $query->where('sync_status', 'synced');
    }
}
