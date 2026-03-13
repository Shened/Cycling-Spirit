<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TrainingPlan extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'description',
        'starts_at',
        'ends_at',
    ];

    protected $casts = [
        'starts_at' => 'date',
        'ends_at'   => 'date',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(TrainingSession::class, 'plan_id');
    }

    public function todaySession(): ?TrainingSession
    {
        return $this->sessions()
            ->whereDate('scheduled_at', today())
            ->first();
    }
}
