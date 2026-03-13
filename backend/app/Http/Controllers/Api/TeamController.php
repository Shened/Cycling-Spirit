<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Team;
use App\Models\TeamInvitation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class TeamController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $teams = $request->user()->teams()->with('owner')->get();

        return response()->json($teams);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $team = Team::create([
            'name'        => $validated['name'],
            'slug'        => Str::slug($validated['name']) . '-' . Str::random(5),
            'description' => $validated['description'] ?? null,
            'owner_id'    => $request->user()->id,
        ]);

        // Adiciona o criador como membro owner
        $team->members()->attach($request->user()->id, [
            'role'      => 'owner',
            'joined_at' => now(),
        ]);

        return response()->json($team->load('owner', 'members'), 201);
    }

    public function show(Request $request, Team $team): JsonResponse
    {
        $this->authorizeTeamMember($request->user(), $team);

        return response()->json($team->load('owner', 'members'));
    }

    public function update(Request $request, Team $team): JsonResponse
    {
        $this->authorizeTeamOwner($request->user(), $team);

        $validated = $request->validate([
            'name'        => 'sometimes|string|max:255',
            'description' => 'nullable|string',
        ]);

        $team->update($validated);

        return response()->json($team);
    }

    public function destroy(Request $request, Team $team): JsonResponse
    {
        $this->authorizeTeamOwner($request->user(), $team);

        $team->delete();

        return response()->json(['message' => 'Equipa eliminada com sucesso.']);
    }

    public function invite(Request $request, Team $team): JsonResponse
    {
        $this->authorizeTeamOwner($request->user(), $team);

        $validated = $request->validate([
            'email' => 'required|email',
        ]);

        // Verifica se já é membro
        $alreadyMember = $team->members()
            ->where('email', $validated['email'])
            ->exists();

        if ($alreadyMember) {
            return response()->json(['message' => 'Este utilizador já é membro da equipa.'], 422);
        }

        // Verifica se já tem convite pendente
        $existingInvite = TeamInvitation::where('team_id', $team->id)
            ->where('email', $validated['email'])
            ->whereNull('accepted_at')
            ->where('expires_at', '>', now())
            ->first();

        if ($existingInvite) {
            return response()->json(['message' => 'Já existe um convite pendente para este email.'], 422);
        }

        $invitation = TeamInvitation::create([
            'team_id'    => $team->id,
            'email'      => $validated['email'],
            'token'      => Str::random(64),
            'expires_at' => now()->addDays(7),
        ]);

        // TODO: Enviar email com o convite
        // Mail::to($validated['email'])->send(new TeamInvitationMail($invitation));

        return response()->json([
            'message'    => 'Convite enviado com sucesso.',
            'invitation' => $invitation,
        ], 201);
    }

    public function acceptInvitation(Request $request, string $token): JsonResponse
    {
        $invitation = TeamInvitation::where('token', $token)
            ->whereNull('accepted_at')
            ->firstOrFail();

        if ($invitation->isExpired()) {
            return response()->json(['message' => 'Este convite expirou.'], 422);
        }

        $user = $request->user();

        // Adiciona à equipa
        $invitation->team->members()->attach($user->id, [
            'role'      => 'member',
            'joined_at' => now(),
        ]);

        $invitation->update(['accepted_at' => now()]);

        return response()->json([
            'message' => 'Entraste na equipa com sucesso!',
            'team'    => $invitation->team->load('members'),
        ]);
    }

    public function removeMember(Request $request, Team $team, User $user): JsonResponse
    {
        $this->authorizeTeamOwner($request->user(), $team);

        if ($user->id === $team->owner_id) {
            return response()->json(['message' => 'Não podes remover o owner da equipa.'], 422);
        }

        $team->members()->detach($user->id);

        return response()->json(['message' => 'Membro removido com sucesso.']);
    }

    public function leaderboard(Request $request, Team $team): JsonResponse
    {
        $this->authorizeTeamMember($request->user(), $team);

        return response()->json($team->monthlyLeaderboard());
    }

    private function authorizeTeamMember(User $user, Team $team): void
    {
        $isMember = $team->members()->where('user_id', $user->id)->exists();
        if (!$isMember) {
            abort(403, 'Não és membro desta equipa.');
        }
    }

    private function authorizeTeamOwner(User $user, Team $team): void
    {
        if ($team->owner_id !== $user->id) {
            abort(403, 'Apenas o owner pode fazer esta ação.');
        }
    }
}
