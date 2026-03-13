<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->enum('type', ['ride', 'run', 'walk'])->default('ride');
            $table->decimal('distance_km', 8, 2);
            $table->integer('duration_seconds');
            $table->integer('elevation_m')->nullable();
            $table->integer('avg_watts')->nullable();
            $table->decimal('avg_heart_rate', 5, 1)->nullable();
            $table->integer('calories')->nullable();
            $table->timestamp('started_at');
            $table->string('strava_id')->unique()->nullable();
            $table->boolean('is_manual')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activities');
    }
};
