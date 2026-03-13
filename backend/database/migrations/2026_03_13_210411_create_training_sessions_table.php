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
        Schema::create('training_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plan_id')->constrained('training_plans')->cascadeOnDelete();
            $table->string('title');
            $table->enum('type', ['base', 'intervals', 'rest', 'race'])->default('base');
            $table->date('scheduled_at');
            $table->integer('duration_min');
            $table->integer('target_watts')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('completed')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('training_sessions');
    }
};
