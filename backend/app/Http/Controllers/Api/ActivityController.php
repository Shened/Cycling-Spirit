<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ActivityController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $activities = $request->user()
            ->activities()
            ->latest('started_at')
            ->paginate(15);

        return response()->json($activities);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title'            => 'required|string|max:255',
            'type'             => 'required|in:ride,run,walk',
            'distance_km'      => 'required|numeric|min:0',
            'duration_seconds' => 'required|integer|min:0',
            'elevation_m'      => 'nullable|integer|min:0',
            'avg_watts'        => 'nullable|integer|min:0',
            'avg_heart_rate'   => 'nullable|integer|min:0',
            'calories'         => 'nullable|integer|min:0',
            'started_at'       => 'required|date',
        ]);

        $activity = $request->user()->activities()->create([
            ...$validated,
            'is_manual' => true,
        ]);

        return response()->json($activity, 201);
    }

    public function show(Request $request, Activity $activity): JsonResponse
    {
        $this->authorize($request->user(), $activity);

        return response()->json($activity);
    }

    public function update(Request $request, Activity $activity): JsonResponse
    {
        $this->authorize($request->user(), $activity);

        $validated = $request->validate([
            'title'            => 'sometimes|string|max:255',
            'type'             => 'sometimes|in:ride,run,walk',
            'distance_km'      => 'sometimes|numeric|min:0',
            'duration_seconds' => 'sometimes|integer|min:0',
            'elevation_m'      => 'nullable|integer|min:0',
            'avg_watts'        => 'nullable|integer|min:0',
            'avg_heart_rate'   => 'nullable|integer|min:0',
            'calories'         => 'nullable|integer|min:0',
            'started_at'       => 'sometimes|date',
        ]);

        $activity->update($validated);

        return response()->json($activity);
    }

    public function destroy(Request $request, Activity $activity): JsonResponse
    {
        $this->authorize($request->user(), $activity);

        $activity->delete();

        return response()->json(['message' => 'Atividade eliminada com sucesso.']);
    }

    private function authorize($user, Activity $activity): void
    {
        if ($activity->user_id !== $user->id) {
            abort(403, 'Não tens permissão para aceder a esta atividade.');
        }
    }
}
