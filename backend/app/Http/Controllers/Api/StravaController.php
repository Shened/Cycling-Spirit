<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;

class StravaController extends Controller
{
    public function redirect(Request $request)
    {
        $userToken = $request->get('token') ?? $request->bearerToken();

        $params = http_build_query([
            'client_id'     => config('services.strava.client_id'),
            'redirect_uri'  => config('services.strava.redirect'),
            'response_type' => 'code',
            'scope'         => 'read,activity:read_all',
            'state'         => $userToken,
        ]);

        return redirect('https://www.strava.com/oauth/authorize?' . $params);
    }

    public function callback(Request $request): JsonResponse
    {
        if ($request->has('error')) {
            return response()->json(['message' => 'Autorização negada pelo Strava.'], 422);
        }

        // Identifica o utilizador pelo token passado no state
        $tokenValue = $request->state;
        $token = \Laravel\Sanctum\PersonalAccessToken::findToken($tokenValue);

        if (!$token) {
            return response()->json(['message' => 'Token inválido.'], 401);
        }

        $user = $token->tokenable;

        // Troca o código pelo token
        $response = Http::post('https://www.strava.com/oauth/token', [
            'client_id'     => config('services.strava.client_id'),
            'client_secret' => config('services.strava.client_secret'),
            'code'          => $request->code,
            'grant_type'    => 'authorization_code',
        ]);

        if ($response->failed()) {
            return response()->json(['message' => 'Erro ao autenticar com o Strava.'], 422);
        }

        $data    = $response->json();
        $athlete = $data['athlete'];

        $user->update([
            'strava_id'               => $athlete['id'],
            'strava_access_token'     => $data['access_token'],
            'strava_refresh_token'    => $data['refresh_token'],
            'strava_token_expires_at' => now()->timestamp($data['expires_at']),
            'avatar'                  => $athlete['profile'] ?? null,
        ]);

        $count = $this->importActivities($user);

        return response()->json([
            'message'            => 'Strava ligado com sucesso!',
            'athlete'            => $athlete,
            'activities_imported' => $count,
        ]);
    }

    public function disconnect(Request $request): JsonResponse
    {
        $request->user()->update([
            'strava_id'               => null,
            'strava_access_token'     => null,
            'strava_refresh_token'    => null,
            'strava_token_expires_at' => null,
        ]);

        return response()->json(['message' => 'Strava desligado com sucesso.']);
    }

    public function sync(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasStravaConnected()) {
            return response()->json(['message' => 'Conta Strava não está ligada.'], 422);
        }

        $count = $this->importActivities($user);

        return response()->json([
            'message' => "Sincronização concluída. {$count} atividades importadas.",
        ]);
    }

    private function refreshTokenIfNeeded($user): void
    {
        if (!$user->stravaTokenIsExpired()) return;

        $response = Http::post('https://www.strava.com/oauth/token', [
            'client_id'     => config('services.strava.client_id'),
            'client_secret' => config('services.strava.client_secret'),
            'refresh_token' => $user->strava_refresh_token,
            'grant_type'    => 'refresh_token',
        ]);

        if ($response->successful()) {
            $data = $response->json();
            $user->update([
                'strava_access_token'     => $data['access_token'],
                'strava_refresh_token'    => $data['refresh_token'],
                'strava_token_expires_at' => now()->timestamp($data['expires_at']),
            ]);
        }
    }

    private function importActivities($user): int
    {
        $this->refreshTokenIfNeeded($user);

        $afterTimestamp = $user->created_at->timestamp;
        $page  = 1;
        $count = 0;

        do {
            $response = Http::withToken($user->strava_access_token)
                ->get('https://www.strava.com/api/v3/athlete/activities', [
                    'per_page' => 50,
                    'page'     => $page,
                    'after'    => $afterTimestamp,
                ]);

            if ($response->failed()) break;

            $activities = $response->json();

            foreach ($activities as $stravaActivity) {
                if (!in_array($stravaActivity['type'], [
                    'Ride',
                    'VirtualRide',
                    'EBikeRide',
                    'MountainBikeRide',
                    'GravelRide'
                ])) continue;

                $exists = Activity::where('strava_id', $stravaActivity['id'])->exists();
                if ($exists) continue;

                try {
                    Activity::create([
                        'user_id'          => $user->id,
                        'title'            => $stravaActivity['name'],
                        'type'             => 'ride',
                        'distance_km'      => round($stravaActivity['distance'] / 1000, 2),
                        'duration_seconds' => (int) $stravaActivity['moving_time'],
                        'elevation_m'      => isset($stravaActivity['total_elevation_gain']) ? (int) $stravaActivity['total_elevation_gain'] : null,
                        'avg_watts'        => isset($stravaActivity['average_watts']) ? (int) $stravaActivity['average_watts'] : null,
                        'avg_heart_rate'   => isset($stravaActivity['average_heartrate']) ? round($stravaActivity['average_heartrate'], 1) : null,
                        'calories'         => isset($stravaActivity['calories']) ? (int) $stravaActivity['calories'] : null,
                        'started_at'       => $stravaActivity['start_date'],
                        'strava_id'        => (string) $stravaActivity['id'],
                        'is_manual'        => false,
                    ]);
                    $count++;
                } catch (\Exception $e) {
                    continue;
                }
            }

            $page++;
        } while (count($activities) === 50);

        return $count;
    }
}
