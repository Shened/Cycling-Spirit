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
        Schema::table('users', function (Blueprint $table) {
            $table->string('avatar')->nullable();
            $table->decimal('weight_kg', 5, 2)->nullable();
            $table->integer('ftp_watts')->nullable();
            $table->string('strava_id')->unique()->nullable();
            $table->text('strava_access_token')->nullable();
            $table->text('strava_refresh_token')->nullable();
            $table->timestamp('strava_token_expires_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'avatar',
                'weight_kg',
                'ftp_watts',
                'strava_id',
                'strava_access_token',
                'strava_refresh_token',
                'strava_token_expires_at'
            ]);
        });
    }
};
