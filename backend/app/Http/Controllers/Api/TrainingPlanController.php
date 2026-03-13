<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TrainingPlan;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class TrainingPlanController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $plans = $request->user()
            ->trainingPlans()
            ->with('sessions')
            ->latest()
            ->get();

        return response()->json($plans);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'starts_at'   => 'required|date',
            'ends_at'     => 'required|date|after:starts_at',
        ]);

        $plan = $request->user()->trainingPlans()->create($validated);

        return response()->json($plan, 201);
    }

    public function show(Request $request, TrainingPlan $trainingPlan): JsonResponse
    {
        $this->authorize($request->user(), $trainingPlan);

        return response()->json($trainingPlan->load('sessions'));
    }

    public function update(Request $request, TrainingPlan $trainingPlan): JsonResponse
    {
        $this->authorize($request->user(), $trainingPlan);

        $validated = $request->validate([
            'title'       => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'starts_at'   => 'sometimes|date',
            'ends_at'     => 'sometimes|date|after:starts_at',
        ]);

        $trainingPlan->update($validated);

        return response()->json($trainingPlan);
    }

    public function destroy(Request $request, TrainingPlan $trainingPlan): JsonResponse
    {
        $this->authorize($request->user(), $trainingPlan);

        $trainingPlan->delete();

        return response()->json(['message' => 'Plano eliminado com sucesso.']);
    }

    private function authorize($user, TrainingPlan $plan): void
    {
        if ($plan->user_id !== $user->id) {
            abort(403, 'Não tens permissão para aceder a este plano.');
        }
    }
}
