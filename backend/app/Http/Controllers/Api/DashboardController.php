<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $now  = now();

        // Atividades do mês atual
        $monthlyActivities = $user->activities()
            ->whereMonth('started_at', $now->month)
            ->whereYear('started_at', $now->year)
            ->get();

        // Atividades da semana atual
        $weeklyActivities = $user->activities()
            ->whereBetween('started_at', [
                $now->startOfWeek()->copy(),
                $now->endOfWeek()->copy(),
            ])
            ->get();

        // Stats do mês
        $monthlyStats = [
            'total_km'         => round($monthlyActivities->sum('distance_km'), 1),
            'total_hours'      => round($monthlyActivities->sum('duration_seconds') / 3600, 1),
            'total_calories'   => $monthlyActivities->sum('calories'),
            'total_activities' => $monthlyActivities->count(),
            'total_elevation'  => $monthlyActivities->sum('elevation_m'),
            'avg_watts'        => round($monthlyActivities->avg('avg_watts') ?? 0),
        ];

        // KM por semana (últimas 8 semanas)
        $weeklyKm = collect(range(7, 0))->map(function ($weeksAgo) use ($user) {
            $start = now()->subWeeks($weeksAgo)->startOfWeek();
            $end   = now()->subWeeks($weeksAgo)->endOfWeek();

            $km = $user->activities()
                ->whereBetween('started_at', [$start, $end])
                ->sum('distance_km');

            return [
                'week'  => $start->format('d M'),
                'km'    => round($km, 1),
            ];
        });

        // Zonas de intensidade (baseado em % do FTP)
        $ftp = $user->ftp_watts ?? 200;
        $zones = [
            'z1_z2' => 0,
            'z3' => 0,
            'z4' => 0,
            'z5' => 0,
        ];

        foreach ($monthlyActivities as $activity) {
            if (!$activity->avg_watts) continue;
            $pct = ($activity->avg_watts / $ftp) * 100;

            if ($pct < 76)       $zones['z1_z2'] += $activity->duration_seconds;
            elseif ($pct < 90)   $zones['z3']    += $activity->duration_seconds;
            elseif ($pct < 105)  $zones['z4']    += $activity->duration_seconds;
            else                 $zones['z5']    += $activity->duration_seconds;
        }

        // Treino de hoje
        $todaySession = null;
        $activePlan = $user->trainingPlans()
            ->where('starts_at', '<=', today())
            ->where('ends_at', '>=', today())
            ->first();

        if ($activePlan) {
            $todaySession = $activePlan->todaySession();
        }

        // Últimas 5 atividades
        $recentActivities = $user->activities()
            ->latest('started_at')
            ->take(5)
            ->get();

        return response()->json([
            'user'              => $user,
            'monthly_stats'     => $monthlyStats,
            'weekly_km'         => $weeklyKm,
            'intensity_zones'   => $zones,
            'today_session'     => $todaySession,
            'recent_activities' => $recentActivities,
        ]);
    }
}