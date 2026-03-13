<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Team extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'logo',
        'owner_id',
    ];

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class)
            ->withPivot('role', 'joined_at')
            ->withTimestamps();
    }

    public function invitations(): HasMany
    {
        return $this->hasMany(TeamInvitation::class);
    }

    // Leaderboard — KM do mês atual
    public function monthlyLeaderboard()
    {
        return $this->members()
            ->with(['activities' => function ($q) {
                $q->whereMonth('started_at', now()->month)
                    ->whereYear('started_at', now()->year);
            }])
            ->get()
            ->map(function ($user) {
                return [
                    'user'          => $user->only('id', 'name', 'avatar'),
                    'total_km'      => round($user->activities->sum('distance_km'), 1),
                    'total_activities' => $user->activities->count(),
                    'total_elevation'  => $user->activities->sum('elevation_m'),
                    'total_hours'      => round($user->activities->sum('duration_seconds') / 3600, 1),
                ];
            })
            ->sortByDesc('total_km')
            ->values();
    }
}
