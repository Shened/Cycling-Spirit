"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Trophy, X, Loader2, ChevronDown, Crown, Target, Calendar } from "lucide-react";
import type { Competition } from "@/types";
import { metricLabel, cn } from "@/lib/utils";
import { format, parseISO, isAfter, isBefore } from "date-fns";
import { pt } from "date-fns/locale";

interface TeamOption {
  id: string; name: string; ownerId: string;
  members: { userId: string; role: string }[];
}

interface Props { userId: string; teams: TeamOption[] }

const METRICS = [
  { value: "distance_km",       label: "Distância (km)" },
  { value: "elevation_m",       label: "Subida (m)" },
  { value: "avg_speed",         label: "Velocidade média" },
  { value: "duration_hours",    label: "Tempo (horas)" },
  { value: "activities_count",  label: "Nº de atividades" },
];

function competitionStatus(c: Competition): { label: string; color: string } {
  const now = new Date();
  const start = parseISO(c.startDate);
  const end   = parseISO(c.endDate);
  if (isBefore(now, start)) return { label: "Em breve",   color: "text-blue-400 bg-blue-400/10 border-blue-400/20" };
  if (isAfter(now, end))    return { label: "Terminada",  color: "text-neutral-500 bg-neutral-500/10 border-neutral-500/20" };
  return                           { label: "A decorrer", color: "text-green-400 bg-green-400/10 border-green-400/20" };
}

export default function CompetitionsClient({ userId, teams }: Props) {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<string>(teams[0]?.id ?? "");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", metric: "distance_km",
    startDate: "", endDate: "",
  });

  const fetchCompetitions = useCallback(async () => {
    if (!selectedTeam) return;
    setLoading(true);
    const res = await fetch(`/api/competitions?teamId=${selectedTeam}`);
    if (res.ok) setCompetitions(await res.json());
    setLoading(false);
  }, [selectedTeam]);

  useEffect(() => { fetchCompetitions(); }, [fetchCompetitions]);

  const isManager = teams.find((t) => t.id === selectedTeam)?.members
    .some((m) => m.userId === userId && ["owner", "admin"].includes(m.role));

  const createCompetition = async () => {
    if (!form.title || !form.startDate || !form.endDate) return;
    setSaving(true);
    const res = await fetch("/api/competitions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, teamId: selectedTeam }),
    });
    setSaving(false);
    if (res.ok) {
      setShowForm(false);
      setForm({ title: "", description: "", metric: "distance_km", startDate: "", endDate: "" });
      fetchCompetitions();
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="font-display text-3xl text-white tracking-wide">COMPETIÇÕES</h1>
          <p className="text-neutral-500 text-sm mt-0.5">Compete com a tua equipa</p>
        </div>
        <div className="flex items-center gap-2">
          {teams.length > 1 && (
            <div className="relative">
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="appearance-none bg-dark-800 border border-white/10 text-white text-sm rounded-xl pl-4 pr-10 py-2.5 focus:outline-none focus:border-brand-500 cursor-pointer"
              >
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
            </div>
          )}
          {isManager && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-all"
            >
              <Plus className="w-4 h-4" /> Nova Competição
            </button>
          )}
        </div>
      </div>

      {teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-up">
          <div className="w-16 h-16 bg-dark-800 border border-white/8 rounded-2xl flex items-center justify-center mb-4">
            <Trophy className="w-8 h-8 text-neutral-600" />
          </div>
          <p className="text-neutral-400 font-medium mb-1">Precisas de uma equipa</p>
          <p className="text-neutral-600 text-sm">Junta-te a uma equipa para participar em competições.</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
      ) : competitions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-up">
          <div className="w-16 h-16 bg-dark-800 border border-white/8 rounded-2xl flex items-center justify-center mb-4">
            <Trophy className="w-8 h-8 text-neutral-600" />
          </div>
          <p className="text-neutral-400 font-medium mb-1">Sem competições ainda</p>
          {isManager && <p className="text-neutral-600 text-sm">Cria a primeira competição da tua equipa.</p>}
        </div>
      ) : (
        <div className="space-y-4 animate-fade-up delay-100">
          {competitions.map((comp, i) => {
            const status = competitionStatus(comp);
            const sorted = [...(comp.entries ?? [])].sort((a, b) => b.value - a.value);
            const myEntry = sorted.find((e) => e.user.id === userId);
            const myRank = sorted.findIndex((e) => e.user.id === userId) + 1;

            return (
              <div key={comp.id} className="bg-dark-800 border border-white/5 rounded-2xl p-6" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="flex items-start justify-between mb-4 gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h3 className="font-bold text-white text-lg">{comp.title}</h3>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", status.color)}>{status.label}</span>
                    </div>
                    {comp.description && <p className="text-sm text-neutral-400 mb-2">{comp.description}</p>}
                    <div className="flex items-center gap-4 text-xs text-neutral-500">
                      <span className="flex items-center gap-1"><Target className="w-3 h-3" /> {metricLabel(comp.metric)}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(parseISO(comp.startDate), "d MMM", { locale: pt })} → {format(parseISO(comp.endDate), "d MMM yyyy", { locale: pt })}
                      </span>
                    </div>
                  </div>
                  {myEntry && (
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-display text-gradient-blue">{myRank}º</p>
                      <p className="text-xs text-neutral-500">{myEntry.value.toFixed(1)}</p>
                    </div>
                  )}
                </div>

                {/* Leaderboard */}
                {sorted.length > 0 && (
                  <div className="space-y-2 mt-4 border-t border-white/5 pt-4">
                    <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">Classificação</p>
                    {sorted.slice(0, 5).map((entry, idx) => (
                      <div key={entry.userId} className={cn("flex items-center gap-3 p-2.5 rounded-xl", entry.userId === userId ? "bg-brand-500/8 border border-brand-500/15" : "bg-dark-700")}>
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

      {/* Create competition modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-800 border border-white/10 rounded-2xl p-6 w-full max-w-md animate-fade-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-white text-lg">Nova Competição</h3>
              <button onClick={() => setShowForm(false)} className="text-neutral-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">Nome *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Desafio de Janeiro" className="w-full bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-brand-500" />
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
