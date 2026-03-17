"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Plus, Trophy, X, Loader2, ChevronDown, Crown,
  Target, Calendar, Check, Users, UserPlus, Clock
} from "lucide-react";
import { metricLabel, cn } from "@/lib/utils";
import { format, parseISO, isAfter, isBefore } from "date-fns";
import { pt } from "date-fns/locale";
import CompetitionDetailModal from "./CompetitionDetailModal";

interface TeamOption {
  id: string; name: string; ownerId: string;
  members: { userId: string; role: string }[];
}

interface CompetitionUser { id: string; name: string; avatar?: string | null }

interface CompetitionInvite {
  id: string; userId: string; status: string; user: CompetitionUser;
}

interface CompetitionEntry {
  userId: string; value: number; user: CompetitionUser;
}

interface Competition {
  id: string; title: string; description?: string | null;
  metric: string; startDate: string; endDate: string;
  createdById: string; status: string;
  teamId?: string | null;
  team?: { id: string; name: string } | null;
  createdBy: { id: string; name: string };
  invites: CompetitionInvite[];
  entries: CompetitionEntry[];
}

interface Props { userId: string; teams: TeamOption[]; allUsers?: { id: string; name: string }[] }

const METRICS = [
  { value: "distance_km", label: "Distância (km)" },
  { value: "elevation_m", label: "Subida (m)" },
  { value: "avg_speed", label: "Velocidade média" },
  { value: "duration_hours", label: "Tempo (horas)" },
  { value: "activities_count", label: "Nº de atividades" },
];

function competitionStatus(c: Competition): { label: string; color: string } {
  const now = new Date();
  const start = parseISO(c.startDate);
  const end = parseISO(c.endDate);
  if (isBefore(now, start)) return { label: "Em breve", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" };
  if (isAfter(now, end)) return { label: "Terminada", color: "text-neutral-500 bg-neutral-500/10 border-neutral-500/20" };
  return { label: "A decorrer", color: "text-green-400 bg-green-400/10 border-green-400/20" };
}

export default function CompetitionsClient({ userId, teams, allUsers = [] }: Props) {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [inviteSearch, setInviteSearch] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    title: "", description: "", metric: "distance_km",
    startDate: "", endDate: "",
    eligibleActivityTypes: ["ride"] as string[],
  });
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);


  const fetchCompetitions = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/competitions");
    if (res.ok) {
      const data = await res.json();
      setCompetitions(data);

      // Sync automático das competições ativas
      for (const comp of data) {
        const now = new Date();
        if (
          comp.status === "approved" &&
          new Date(comp.startDate) <= now &&
          new Date(comp.endDate) >= now
        ) {
          fetch(`/api/competitions/${comp.id}/sync`, { method: "POST" });
        }
      }
    }
    setLoading(false);
  }, []);

  const respondCompetition = async (id: string, status: "approved" | "rejected") => {
    await fetch(`/api/competitions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchCompetitions();
  };

  useEffect(() => { fetchCompetitions(); }, [fetchCompetitions]);

  const createCompetition = async () => {
    if (!form.title || !form.startDate || !form.endDate) return;
    setSaving(true);
    const res = await fetch("/api/competitions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        teamId: selectedTeam || null,
        inviteUserIds: selectedUsers.map((u) => u.id),
        eligibleActivityTypes: form.eligibleActivityTypes,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setShowForm(false);
      setForm({ title: "", description: "", metric: "distance_km", startDate: "", endDate: "", eligibleActivityTypes: ["ride"] });
      setSelectedTeam("");
      setSelectedUsers([]);
      fetchCompetitions();
    }
  };

  const respondInvite = async (competitionId: string, inviteId: string, status: "accepted" | "declined") => {
    await fetch(`/api/competitions/${competitionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteId, status }),
    });
    fetchCompetitions();
  };

  const deleteCompetition = async (id: string) => {
    if (!confirm("Eliminar esta competição?")) return;
    await fetch(`/api/competitions/${id}`, { method: "DELETE" });
    fetchCompetitions();
  };

  const filteredUsers = allUsers.filter(
    (u) =>
      u.id !== userId &&
      u.name.toLowerCase().includes(inviteSearch.toLowerCase()) &&
      !selectedUsers.find((s) => s.id === u.id)
  );

  // Convites pendentes para o utilizador atual
  const myPendingInvites = competitions.flatMap((c) =>
    c.invites
      .filter((i) => i.userId === userId && i.status === "pending")
      .map((i) => ({ ...i, competition: c }))
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="font-display text-3xl text-white tracking-wide">COMPETIÇÕES</h1>
          <p className="text-neutral-500 text-sm mt-0.5">Compete com a tua equipa ou amigos</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-all"
        >
          <Plus className="w-4 h-4" /> Nova Competição
        </button>
      </div>

      {/* Convites pendentes */}
      {myPendingInvites.length > 0 && (
        <div className="animate-fade-up delay-100 bg-brand-500/5 border border-brand-500/20 rounded-2xl p-5">
          <h2 className="font-semibold text-brand-300 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Convites Pendentes ({myPendingInvites.length})
          </h2>
          <div className="space-y-2">
            {myPendingInvites.map((invite) => (
              <div key={invite.id} className="flex items-center gap-3 bg-dark-800 p-3 rounded-xl border border-white/5 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{invite.competition.title}</p>
                  <p className="text-xs text-neutral-500">
                    Convidado por {invite.competition.createdBy.name} • {metricLabel(invite.competition.metric)}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => respondInvite(invite.competition.id, invite.id, "accepted")}
                    className="flex items-center gap-1.5 bg-brand-500/15 border border-brand-500/30 text-brand-300 hover:bg-brand-500/25 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
                  >
                    <Check className="w-3.5 h-3.5" /> Aceitar
                  </button>
                  <button
                    onClick={() => respondInvite(invite.competition.id, invite.id, "declined")}
                    className="flex items-center gap-1.5 bg-dark-700 border border-white/8 text-neutral-400 hover:text-red-400 text-xs px-3 py-1.5 rounded-lg transition-all"
                  >
                    <X className="w-3.5 h-3.5" /> Recusar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pendentes de aprovação (só para managers) */}
      {competitions.filter((c) => {
        if (c.status !== "pending" || !c.teamId) return false;
        const tid = c.teamId;
        return teams.find((t) => t.id === tid)?.members
          .some((m) => m.userId === userId && ["owner", "admin"].includes(m.role)) ?? false;
      }).length > 0 && (
          <div className="animate-fade-up delay-150 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-5">
            <h2 className="font-semibold text-yellow-400 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Pendentes de Aprovação
            </h2>
            <div className="space-y-2">
              {competitions
                .filter((c) => {
                  if (c.status !== "pending" || !c.teamId) return false;
                  const tid = c.teamId;
                  return teams.find((t) => t.id === tid)?.members
                    .some((m) => m.userId === userId && ["owner", "admin"].includes(m.role)) ?? false;
                })
                .map((c) => (
                  <div key={c.id} className="flex items-center gap-3 bg-dark-800 p-3 rounded-xl border border-white/5 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{c.title}</p>
                      <p className="text-xs text-neutral-500">
                        Criada por {c.createdBy.name} • {metricLabel(c.metric)} • {c.team?.name}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => respondCompetition(c.id, "approved")}
                        className="flex items-center gap-1.5 bg-green-500/15 border border-green-500/30 text-green-400 hover:bg-green-500/25 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
                      >
                        <Check className="w-3.5 h-3.5" /> Aprovar
                      </button>
                      <button
                        onClick={() => respondCompetition(c.id, "rejected")}
                        className="flex items-center gap-1.5 bg-dark-700 border border-white/8 text-neutral-400 hover:text-red-400 text-xs px-3 py-1.5 rounded-lg transition-all"
                      >
                        <X className="w-3.5 h-3.5" /> Rejeitar
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
      ) : competitions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-up">
          <div className="w-16 h-16 bg-dark-800 border border-white/8 rounded-2xl flex items-center justify-center mb-4">
            <Trophy className="w-8 h-8 text-neutral-600" />
          </div>
          <p className="text-neutral-400 font-medium mb-1">Sem competições ainda</p>
          <p className="text-neutral-600 text-sm">Cria uma competição para a tua equipa ou convida amigos.</p>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-up delay-200">
          {competitions.map((comp, i) => {
            const status = competitionStatus(comp);
            const sorted = [...comp.entries].sort((a, b) => b.value - a.value);
            const myEntry = sorted.find((e) => e.userId === userId);
            const myRank = sorted.findIndex((e) => e.userId === userId) + 1;
            const canDelete = comp.createdById === userId;
            const acceptedInvites = comp.invites.filter((i) => i.status === "accepted");
            const pendingInvites = comp.invites.filter((i) => i.status === "pending");

            return (

              <div
                key={comp.id}
                className="bg-dark-800 border border-white/5 rounded-2xl p-6 cursor-pointer hover:border-white/10 transition-all"
                style={{ animationDelay: `${i * 80}ms` }}
                onClick={() => setSelectedCompetition(comp)}
              >
                <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h3 className="font-bold text-white text-lg">{comp.title}</h3>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", status.color)}>
                        {status.label}
                      </span>
                      {comp.team && (
                        <span className="flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full border font-medium text-purple-400 bg-purple-400/10 border-purple-400/20">
                          <Users className="w-3 h-3" /> {comp.team.name}
                        </span>
                      )}
                    </div>
                    {comp.description && <p className="text-sm text-neutral-400 mb-2">{comp.description}</p>}
                    <div className="flex items-center gap-4 text-xs text-neutral-500 flex-wrap">
                      <span className="flex items-center gap-1"><Target className="w-3 h-3" /> {metricLabel(comp.metric)}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(parseISO(comp.startDate), "d MMM", { locale: pt })} → {format(parseISO(comp.endDate), "d MMM yyyy", { locale: pt })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {acceptedInvites.length + (comp.team ? 0 : 1)} participantes
                        {pendingInvites.length > 0 && <span className="text-yellow-400">• {pendingInvites.length} pendentes</span>}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {myEntry && myRank > 0 && (
                      <div className="text-right">
                        <p className="text-2xl font-display text-gradient">{myRank}º</p>
                        <p className="text-xs text-neutral-500">{myEntry.value.toFixed(1)}</p>
                      </div>
                    )}
                    {canDelete && (
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteCompetition(comp.id); }}
                        className="w-8 h-8 rounded-lg bg-dark-700 border border-white/8 text-neutral-500 hover:text-red-400 hover:border-red-500/20 flex items-center justify-center transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Leaderboard */}
                {sorted.length > 0 && (
                  <div className="space-y-2 mt-4 border-t border-white/5 pt-4">
                    <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">Classificação</p>
                    {sorted.slice(0, 5).map((entry, idx) => (
                      <div key={entry.userId} className={cn("flex items-center gap-3 p-2.5 rounded-xl",
                        entry.userId === userId ? "bg-brand-500/8 border border-brand-500/15" : "bg-dark-700"
                      )}>
                        <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                          idx === 0 ? "bg-yellow-500/20 text-yellow-400" :
                            idx === 1 ? "bg-neutral-400/20 text-neutral-300" :
                              idx === 2 ? "bg-amber-700/20 text-amber-600" :
                                "bg-dark-600 text-neutral-500"
                        )}>
                          {idx === 0 ? <Crown className="w-3 h-3" /> : idx + 1}
                        </div>
                        <span className="text-sm text-white flex-1 truncate">{entry.user.name}</span>
                        <span className="text-sm font-mono font-bold text-brand-400">{entry.value.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Competition detail modal */}
      {selectedCompetition && (
        <CompetitionDetailModal
          competition={selectedCompetition}
          userId={userId}
          onClose={() => setSelectedCompetition(null)}
        />
      )}

      {/* Create modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-800 border border-white/10 rounded-2xl p-6 w-full max-w-md animate-fade-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-white text-lg">Nova Competição</h3>
              <button onClick={() => setShowForm(false)} className="text-neutral-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">Nome *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Desafio de Março" className="w-full bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-brand-500" />
              </div>

              <div>
                <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">Descrição</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-brand-500 resize-none" />
              </div>

              <div>
                <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">Objetivo *</label>
                <div className="relative">
                  <select value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })} className="w-full appearance-none bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 cursor-pointer pr-10">
                    {METRICS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
                </div>
              </div>

              {/* Tipos de atividade elegíveis */}
              <div>
                <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">
                  Desportos Elegíveis
                </label>
                <p className="text-xs text-neutral-600 mb-2">Seleciona quais atividades contam para esta competição</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { value: "ride", label: "Ciclismo (Estrada)" },
                    { value: "mountain_bike", label: "BTT" },
                    { value: "gravel_ride", label: "Gravel" },
                    { value: "e_bike", label: "Bicicleta Elétrica" },
                    { value: "virtual_ride", label: "Indoor/Virtual" },
                    { value: "run", label: "Corrida" },
                    { value: "trail_run", label: "Trail" },
                    { value: "walk", label: "Caminhada" },
                    { value: "hike", label: "Trekking" },
                    { value: "swim", label: "Natação" },
                  ].map((t) => {
                    const active = form.eligibleActivityTypes.includes(t.value);
                    return (
                      <button
                        key={t.value}
                        onClick={() => {
                          setForm({
                            ...form,
                            eligibleActivityTypes: active
                              ? form.eligibleActivityTypes.filter((v) => v !== t.value)
                              : [...form.eligibleActivityTypes, t.value],
                          });
                        }}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-xl border text-xs text-left transition-all",
                          active
                            ? "border-brand-500/40 bg-brand-500/10 text-brand-300"
                            : "border-white/8 bg-dark-700 text-neutral-500 hover:border-white/15 hover:text-neutral-300"
                        )}
                      >
                        <div className={cn("w-2 h-2 rounded-full shrink-0", active ? "bg-brand-400" : "bg-dark-500")} />
                        {t.label}
                      </button>
                    );
                  })}
                </div>
                {form.eligibleActivityTypes.length === 0 && (
                  <p className="text-xs text-red-400 mt-1.5">Seleciona pelo menos um desporto</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">Início *</label>
                  <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 [color-scheme:dark]" />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">Fim *</label>
                  <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="w-full bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 [color-scheme:dark]" />
                </div>
              </div>

              {/* Equipa */}
              {teams.length > 0 && (
                <div>
                  <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">Equipa (opcional)</label>
                  <div className="relative">
                    <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)} className="w-full appearance-none bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 cursor-pointer pr-10">
                      <option value="">Sem equipa</option>
                      {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Convidar utilizadores */}
              {!selectedTeam && (
                <div>
                  <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5" /> Convidar Participantes
                  </label>
                  <input
                    type="text"
                    value={inviteSearch}
                    onChange={(e) => setInviteSearch(e.target.value)}
                    placeholder="Pesquisar utilizadores..."
                    className="w-full bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-brand-500 mb-2"
                  />
                  {inviteSearch.length > 0 && filteredUsers.length > 0 && (
                    <div className="bg-dark-700 border border-white/8 rounded-xl overflow-hidden mb-2 max-h-36 overflow-y-auto">
                      {filteredUsers.slice(0, 5).map((u) => (
                        <button
                          key={u.id}
                          onClick={() => { setSelectedUsers([...selectedUsers, u]); setInviteSearch(""); }}
                          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors text-left"
                        >
                          <div className="w-7 h-7 rounded-lg bg-brand-500/20 flex items-center justify-center shrink-0">
                            <span className="text-brand-400 text-xs font-bold">{u.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <span className="text-sm text-white">{u.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedUsers.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedUsers.map((u) => (
                        <span key={u.id} className="flex items-center gap-1.5 bg-brand-500/15 border border-brand-500/30 text-brand-300 text-xs px-2.5 py-1 rounded-full">
                          {u.name}
                          <button onClick={() => setSelectedUsers(selectedUsers.filter((s) => s.id !== u.id))}>
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl bg-dark-700 border border-white/8 text-neutral-400 hover:text-white text-sm transition-all">Cancelar</button>
              <button onClick={createCompetition} disabled={saving || !form.title || !form.startDate || !form.endDate} className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}