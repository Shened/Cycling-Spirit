<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TrainingPlan;
use App\Models\TrainingSession;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class TrainingSessionController extends Controller
{
    public function index(Request $request, TrainingPlan $trainingPlan): JsonResponse
    {
        $this->authorize($request->user(), $trainingPlan);

        $sessions = $trainingPlan->sessions()
            ->orderBy('scheduled_at')
            ->get();

        return response()->json($sessions);
    }

    public function store(Request $request, TrainingPlan $trainingPlan): JsonResponse
    {
        $this->authorize($request->user(), $trainingPlan);

        $validated = $request->validate([
            'title'        => 'required|string|max:255',
            'type'         => 'required|in:base,intervals,rest,race',
            'scheduled_at' => 'required|date',
            'duration_min' => 'required|integer|min:1',
            'target_watts' => 'nullable|integer|min:0',
            'notes'        => 'nullable|string',
        ]);

        $session = $trainingPlan->sessions()->create($validated);

        return response()->json($session, 201);
    }

    public function show(Request $request, TrainingPlan $trainingPlan, TrainingSession $session): JsonResponse
    {
        $this->authorize($request->user(), $trainingPlan);

        return response()->json($session);
    }

    public function update(Request $request, TrainingPlan $trainingPlan, TrainingSession $session): JsonResponse
    {
        $this->authorize($request->user(), $trainingPlan);

        $validated = $request->validate([
            'title'        => 'sometimes|string|max:255',
            'type'         => 'sometimes|in:base,intervals,rest,race',
            'scheduled_at' => 'sometimes|date',
            'duration_min' => 'sometimes|integer|min:1',
            'target_watts' => 'nullable|integer|min:0',
            'notes'        => 'nullable|string',
            'completed'    => 'sometimes|boolean',
        ]);

        $session->update($validated);

        return response()->json($session);
    }

    public function destroy(Request $request, TrainingPlan $trainingPlan, TrainingSession $session): JsonResponse
    {
        $this->authorize($request->user(), $trainingPlan);

        $session->delete();

        return response()->json(['message' => 'Sessão eliminada com sucesso.']);
    }

    private function authorize($user, TrainingPlan $plan): void
    {
        if ($plan->user_id !== $user->id) {
            abort(403, 'Não tens permissão para aceder a este plano.');
        }
    }
}
