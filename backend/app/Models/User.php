<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'role_id', 'username', 'password_hash', 'full_name',
        'email', 'phone', 'is_active', 'last_login_at', 'last_login_ip',
        'managed_lga_id', 'managed_ward_id',
    ];

    protected $hidden = ['password_hash'];

    protected $casts = [
        'is_active' => 'boolean',
        'last_login_at' => 'datetime',
    ];

    public function getAuthPassword()
    {
        return $this->password_hash;
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function agentAssignments(): HasMany
    {
        return $this->hasMany(AgentAssignment::class);
    }

    public function currentAssignment(): ?AgentAssignment
    {
        return $this->agentAssignments()->where('is_current', true)->first();
    }

    public function assignedPollingUnitId(): ?int
    {
        return $this->currentAssignment()?->polling_unit_id;
    }

    public function registrations(): HasMany
    {
        return $this->hasMany(Registration::class, 'registered_by');
    }

    public function isAdmin(): bool
    {
        return $this->role?->name === 'admin';
    }

    public function isLgaCoordinator(): bool
    {
        return $this->role?->name === 'lga_coordinator';
    }

    public function isWardCoordinator(): bool
    {
        return $this->role?->name === 'ward_coordinator';
    }

    public function isAgent(): bool
    {
        return $this->role?->name === 'agent';
    }

    public function managedLga(): BelongsTo
    {
        return $this->belongsTo(Lga::class, 'managed_lga_id');
    }

    public function managedWard(): BelongsTo
    {
        return $this->belongsTo(Ward::class, 'managed_ward_id');
    }

    public function managedLgaId(): ?int
    {
        if (!$this->isLgaCoordinator()) return null;
        return $this->managed_lga_id;
    }

    public function managedWardId(): ?int
    {
        if (!$this->isWardCoordinator()) return null;
        return $this->managed_ward_id;
    }

    public function assignedPollingUnit(): BelongsTo
{
    return $this->belongsTo(PollingUnit::class, 'assigned_polling_unit_id');
}

}
