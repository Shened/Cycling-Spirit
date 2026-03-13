<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Activity extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'type',
        'distance_km',
        'duration_seconds',
        'elevation_m',
        'avg_watts',
        'avg_heart_rate',
        'calories',
        'started_at',
        'strava_id',
        'is_manual',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'is_manual'  => 'boolean',
        'distance_km' => 'decimal:2',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // Helpers
    public function getDurationFormattedAttribute(): string
    {
        $h = intdiv($this->duration_seconds, 3600);
        $m = intdiv($this->duration_seconds % 3600, 60);
        return "{$h}h {$m}m";
    }

    public function isFromStrava(): bool
    {
        return !is_null($this->strava_id);
    }
}
