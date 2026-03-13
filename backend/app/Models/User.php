<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'avatar',
        'weight_kg',
        'ftp_watts',
        'strava_id',
        'strava_access_token',
        'strava_refresh_token',
        'strava_token_expires_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'strava_access_token',
        'strava_refresh_token',
    ];

    protected $casts = [
        'email_verified_at'      => 'datetime',
        'strava_token_expires_at' => 'datetime',
        'password'               => 'hashed',
    ];

    // Relações
    public function teams(): BelongsToMany
    {
        return $this->belongsToMany(Team::class)
            ->withPivot('role', 'joined_at')
            ->withTimestamps();
    }

    public function ownedTeams(): HasMany
    {
        return $this->hasMany(Team::class, 'owner_id');
    }

    public function activities(): HasMany
    {
        return $this->hasMany(Activity::class);
    }

    public function trainingPlans(): HasMany
    {
        return $this->hasMany(TrainingPlan::class);
    }

    // Helpers Strava
    public function hasStravaConnected(): bool
    {
        return !is_null($this->strava_id);
    }

    public function stravaTokenIsExpired(): bool
    {
        return $this->strava_token_expires_at?->isPast() ?? true;
    }
}
