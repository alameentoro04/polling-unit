<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FormField extends Model
{
    use HasFactory;

    protected $fillable = [
        'label', 'key', 'type', 'required',
        'options', 'sort_order', 'active',
        'placeholder', 'help_text'
    ];

    protected $casts = [
        'required' => 'boolean',
        'active' => 'boolean',
        'options' => 'array',
    ];

    public function scopeActive($query)
    {
        return $query->where('active', true)->orderBy('sort_order');
    }
}
