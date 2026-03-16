"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Bike, Clock, Mountain, Flame, BarChart2, Zap,
  Wind, Heart, RefreshCw, Settings2, Check, X,
  ChevronDown, TrendingUp, Activity
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from "recharts";
import { formatDistance, formatDuration, activityTypeEmoji } from "@/lib/utils";
import type { DashboardStats, DashboardWidget } from "@/types";

const ALL_WIDGETS: { key: DashboardWidget; label: string; icon: React.ElementType; unit: string; color: string }[] = [
  { key: "distance", label: "Distância", icon: Bike, unit: "km", color: "#2B8FBF" },
  { key: "duration", label: "Tempo", icon: Clock, unit: "h", color: "#3AADD4" },
  { key: "elevation", label: "Subida Total", icon: Mountain, unit: "m", color: "#8B9FE8" },
  { key: "calories", label: "Calorias", icon: Flame, unit: "kcal", color: "#E8177A" },
  { key: "activities", label: "Atividades", icon: BarChart2, unit: "", color: "#1fb8a0" },
  { key: "avgWatts", label: "Watts Médios", icon: Zap, unit: "w", color: "#3AADD4" },
  { key: "avgSpeed", label: "Velocidade Média", icon: Wind, unit: "km/h", color: "#60cfe8" },
  { key: "avgHeartRate", label: "FC Média", icon: Heart, unit: "bpm", color: "#ed4d99" },
];

type Period = "week" | "month" | "year";

const PERIODS: { value: Period; label: string }[] = [
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
  { value: "year", label: "Ano" },
];

const PERIOD_LABELS: Record<Period, string> = {
  week: "esta semana",
  month: "este mês",
  year: "este ano",
};

function getStatValue(stats: DashboardStats, key: DashboardWidget): string {
  switch (key) {
    case "distance": return formatDistance(stats.totalKm);
    case "duration": return formatDuration(stats.totalHours * 3600);
    case "elevation": return `${stats.totalElevation.toLocaleString()} m`;
    case "calories": return `${stats.totalCalories.toLocaleString()} kcal`;
    case "activities": return `${stats.totalActivities}`;
    case "avgWatts": return stats.avgWatts ? `${stats.avgWatts} w` : "—";
    case "avgSpeed": return stats.avgSpeed ? `${stats.avgSpeed} km/h` : "—";
    case "avgHeartRate": return stats.avgHeartRate ? `${stats.avgHeartRate} bpm` : "—";
  }
}

interface TeamOption { team: { id: string; name: string } }

interface Props {
  user: {
    id: string; name: string; stravaId?: string | null;
    dashboardWidgets: string[];
    teamMemberships: TeamOption[];
  };
}

export default function DashboardClient({ user }: Props) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [editingWidgets, setEditingWidgets] = useState(false);
  const [period, setPeriod] = useState<Period>("month");
  const [activeWidgets, setActiveWidgets] = useState<DashboardWidget[]>(
    (user.dashboardWidgets as DashboardWidget[]).length > 0
      ? (user.dashboardWidgets as DashboardWidget[])
      : ["distance", "duration", "elevation", "calories", "activities", "avgWatts"]
  );
  const [selectedContext, setSelectedContext] = useState<{ type: "user" | "team"; id: string; label: string }>({
    type: "user", id: user.id, label: "O meu Dashboard",
  });

  const contextOptions = [
    { type: "user" as const, id: user.id, label: "O meu Dashboard" },
    ...user.teamMemberships.map((m) => ({
      type: "team" as const,
      id: m.team.id,
      label: m.team.name,
    })),
  ];

  const fetchStats = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ period });
    if (selectedContext.type === "team") params.set("teamId", selectedContext.id);
    else if (selectedContext.id !== user.id) params.set("userId", selectedContext.id);
    const res = await fetch(`/api/dashboard?${params}`);
    if (res.ok) setStats(await res.json());
    setLoading(false);
  }, [selectedContext, user.id, period]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const syncStrava = async () => {
    setSyncing(true);
    await fetch("/api/strava/sync", { method: "POST" });
    await fetchStats();
    setSyncing(false);
  };

  const saveWidgets = async () => {
    await fetch("/api/dashboard/widgets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ widgets: activeWidgets }),
    });
    setEditingWidgets(false);
  };

  const toggleWidget = (key: DashboardWidget) => {
    setActiveWidgets((prev) =>
      prev.includes(key) ? prev.filter((w) => w !== key) : [...prev, key]
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="font-display text-3xl text-white tracking-wide">DASHBOARD</h1>
          <p className="text-neutral-500 text-sm mt-0.5">Estatísticas {PERIOD_LABELS[period]}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {contextOptions.length > 1 && (
            <div className="relative">
              <select
                value={`${selectedContext.type}:${selectedContext.id}`}
                onChange={(e) => {
                  const [type, id] = e.target.value.split(":");
                  const opt = contextOptions.find((o) => o.type === type && o.id === id);
                  if (opt) setSelectedContext(opt);
                }}
                className="appearance-none bg-dark-800 border border-white/10 text-white text-sm rounded-xl pl-4 pr-10 py-2.5 focus:outline-none focus:border-brand-500 cursor-pointer"
              >
                {contextOptions.map((o) => (
                  <option key={`${o.type}:${o.id}`} value={`${o.type}:${o.id}`}>{o.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
            </div>
          )}

          {user.stravaId && (
            <button
              onClick={syncStrava}
              disabled={syncing}
              className="flex items-center gap-2 bg-[#FC4C02]/10 border border-[#FC4C02]/30 text-[#FC4C02] hover:bg-[#FC4C02]/20 text-sm font-medium px-4 py-2.5 rounded-xl transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "A sincronizar..." : "Sync Strava"}
            </button>
          )}
          {!user.stravaId && (
            <a
              href="/api/strava/connect"
              className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all"
              style={{ background: "#FC4C02" }}
            >
              <Activity className="w-4 h-4" />
              Ligar Strava
            </a>
          )}
          <button
            onClick={() => setEditingWidgets(true)}
            className="flex items-center gap-2 bg-dark-800 border border-white/10 text-neutral-400 hover:text-white hover:border-white/20 text-sm px-4 py-2.5 rounded-xl transition-all"
          >
            <Settings2 className="w-4 h-4" />
            <span className="hidden sm:inline">Personalizar</span>
          </button>
        </div>
      </div>

      {/* Period switcher */}
      <div className="flex items-center gap-1.5 animate-fade-up delay-100 bg-dark-800 border border-white/5 rounded-xl p-1 w-fit">
        {PERIODS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setPeriod(value)}
            className="relative px-5 py-2 rounded-lg text-sm font-medium transition-all"
            style={period === value ? {
              background: "linear-gradient(135deg, rgba(43,143,191,0.2), rgba(232,23,122,0.2))",
              color: "#fff",
            } : { color: "#737373" }}
          >
            {period === value && (
              <span className="absolute inset-0 rounded-lg border border-brand-500/30" />
            )}
            {label}
          </button>
        ))}
      </div>

      {/* Stats widgets */}
      {
        loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: activeWidgets.length || 6 }).map((_, i) => (
              <div key={i} className="bg-dark-800 border border-white/5 rounded-2xl p-5 h-28 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {activeWidgets.map((key, i) => {
              const w = ALL_WIDGETS.find((w) => w.key === key);
              if (!w || !stats) return null;
              const Icon = w.icon;
              return (
                <div
                  key={key}
                  className="animate-fade-up bg-dark-800 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all group"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${w.color}18` }}>
                      <Icon className="w-4 h-4" style={{ color: w.color }} />
                    </div>
                    <TrendingUp className="w-3.5 h-3.5 text-neutral-700 group-hover:text-neutral-500 transition-colors" />
                  </div>
                  <p className="text-xl font-bold text-white font-mono tracking-tight">
                    {getStatValue(stats, key)}
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5">{w.label}</p>
                </div>
              );
            })}
          </div>
        )
      }

      {/* Weekly chart */}
      {
        stats && (
          <div className="animate-fade-up delay-200 bg-dark-800 border border-white/5 rounded-2xl p-6">
            <div className="mb-6">
              <h2 className="font-semibold text-white">Km por Semana</h2>
              <p className="text-xs text-neutral-500 mt-0.5">Últimas 8 semanas</p>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={stats.weeklyKm} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="kmGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2B8FBF" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#2B8FBF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="week" tick={{ fill: "#737373", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#737373", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#1C2533", border: "1px solid rgba(43,143,191,0.2)", borderRadius: "12px", color: "#fff", fontSize: 12 }}
                  cursor={{ stroke: "#2B8FBF", strokeWidth: 1, strokeDasharray: "4 4" }}
                />
                <Area type="monotone" dataKey="km" stroke="#2B8FBF" strokeWidth={2} fill="url(#kmGrad)" dot={{ fill: "#2B8FBF", r: 3, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )
      }

      {/* Recent activities */}
      {
        stats?.recentActivities && stats.recentActivities.length > 0 && (
          <div className="animate-fade-up delay-300 bg-dark-800 border border-white/5 rounded-2xl p-6">
            <h2 className="font-semibold text-white mb-4">Atividades Recentes</h2>
            <div className="space-y-2">
              {stats.recentActivities.map((act) => (
                <div key={act.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/3 transition-colors">
                  <div className="w-9 h-9 bg-dark-700 rounded-xl flex items-center justify-center text-base shrink-0">
                    {activityTypeEmoji(act.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{act.title}</p>
                    <p className="text-xs text-neutral-500">
                      {new Date(act.startedAt).toLocaleDateString("pt", { day: "2-digit", month: "short" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-right shrink-0">
                    <div>
                      <p className="text-sm font-mono font-semibold text-white">{act.distanceKm.toFixed(1)} km</p>
                      <p className="text-xs text-neutral-500">{formatDuration(act.durationSeconds)}</p>
                    </div>
                    {act.elevationM && (
                      <div className="hidden sm:block">
                        <p className="text-sm font-mono text-neutral-300">{act.elevationM}m</p>
                        <p className="text-xs text-neutral-500">subida</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      }

      {/* Widget editor modal */}
      {
        editingWidgets && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-dark-800 border border-white/10 rounded-2xl p-6 w-full max-w-md animate-fade-up">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-white text-lg">Personalizar Dashboard</h3>
                <button onClick={() => setEditingWidgets(false)} className="text-neutral-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-neutral-500 text-sm mb-4">Seleciona as métricas a mostrar no teu dashboard.</p>
              <div className="grid grid-cols-2 gap-2 mb-6">
                {ALL_WIDGETS.map(({ key, label, icon: Icon, color }) => {
                  const active = activeWidgets.includes(key);
                  return (
                    <button
                      key={key}
                      onClick={() => toggleWidget(key)}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${active
                        ? "border-brand-500/40 bg-brand-500/10 text-white"
                        : "border-white/8 bg-dark-700 text-neutral-500 hover:border-white/15"
                        }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" style={{ color: active ? color : undefined }} />
                      <span className="text-xs font-medium">{label}</span>
                      {active && <Check className="w-3.5 h-3.5 ml-auto text-brand-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setEditingWidgets(false)}
                  className="flex-1 py-2.5 rounded-xl bg-dark-700 border border-white/8 text-neutral-400 hover:text-white text-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveWidgets}
                  className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm transition-all"
                  style={{ background: "linear-gradient(135deg, #2B8FBF, #E8177A)" }}
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}