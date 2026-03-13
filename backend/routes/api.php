<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\TeamController;
use App\Http\Controllers\Api\ActivityController;
use App\Http\Controllers\Api\TrainingPlanController;
use App\Http\Controllers\Api\TrainingSessionController;
use App\Http\Controllers\Api\StravaController;
use App\Http\Controllers\Api\DashboardController;
use Illuminate\Support\Facades\Route;

// Rotas públicas
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login',    [AuthController::class, 'login']);

// Strava OAuth (público — redirect)
Route::get('/strava/redirect', [StravaController::class, 'redirect']);
Route::get('/strava/callback', [StravaController::class, 'callback']);

// Rotas protegidas
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me',      [AuthController::class, 'me']);

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Atividades
    Route::apiResource('activities', ActivityController::class);

    // Planos de treino
    Route::apiResource('training-plans', TrainingPlanController::class);
    Route::apiResource('training-plans.sessions', TrainingSessionController::class);

    // Equipas
    Route::apiResource('teams', TeamController::class);
    Route::post('/teams/{team}/invite',          [TeamController::class, 'invite']);
    Route::post('/teams/invitations/{token}/accept', [TeamController::class, 'acceptInvitation']);
    Route::delete('/teams/{team}/members/{user}', [TeamController::class, 'removeMember']);
    Route::get('/teams/{team}/leaderboard',      [TeamController::class, 'leaderboard']);

    // Strava
    Route::delete('/strava/disconnect', [StravaController::class, 'disconnect']);
    Route::post('/strava/sync',         [StravaController::class, 'sync']);
});
