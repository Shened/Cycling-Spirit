<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TrainingSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'plan_id',
        'title',
        'type',
        'scheduled_at',
        'duration_min',
        'target_watts',
        'notes',
        'completed',
    ];

    protected $casts = [
        'scheduled_at' => 'date',
        'completed'    => 'boolean',
    ];

    public function plan(): BelongsTo
    {
        return $this->belongsTo(TrainingPlan::class);
    }
}
