// src/components/goals/GoalsClient.tsx
// Substitui o ficheiro existente

"use client";
import { useState, useEffect, useCallback } from "react";
import {
    Target, Plus, Trash2, Loader2, Bike,
    Clock, BarChart2, ChevronDown, Check, X,
    Sparkles, TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";

type Metric = "distance_km" | "duration_hours" | "activities_count";
type Period = "monthly" | "annual";
type ActivityGroup = "all" | "cycling" | "running" | "walking" | "swimming";

interface Goal {
    id: string;
    metric: Metric;
    period: Period;
    target: number;
    year: number;
    month: number | null;
    activityGroup: ActivityGroup;
    current: number;
    pct: number;
    isActive: boolean;
}

interface Suggestion {
    metric: Metric;
    period: Period;
    target: number;
    year: number;
    month: number | null;
    activityGroup: string;
    label: string;
    reason: string;
    boost: string;
    groupEmoji: string;
    groupLabel: string;
}

const METRIC_CONFIG: Record<Metric, { label: string; icon: React.ElementType; unit: string; color: string; placeholder: string }> = {
    distance_km: { label: "Distância", icon: Bike, unit: "km", color: "#2B8FBF", placeholder: "Ex: 500" },
    duration_hours: { label: "Tempo", icon: Clock, unit: "h", color: "#3AADD4", placeholder: "Ex: 40" },
    activities_count: { label: "Atividades", icon: BarChart2, unit: "", color: "#1fb8a0", placeholder: "Ex: 20" },
};

const ACTIVITY_GROUPS: Record<string, { label: string; emoji: string; color: string }> = {
    all: { label: "Todos", emoji: "🏅", color: "#8b8b8b" },
    cycling: { label: "Ciclismo", emoji: "🚴", color: "#2B8FBF" },
    running: { label: "Corrida", emoji: "🏃", color: "#f97316" },
    walking: { label: "Caminhada", emoji: "🚶", color: "#22c55e" },
    swimming: { label: "Natação", emoji: "🏊", color: "#06b6d4" },
};

const MONTHS = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

function GroupBadge({ group }: { group: ActivityGroup }) {
    if (!group || group === "all") return null;
    const config = ACTIVITY_GROUPS[group];
    if (!config) return null;
    return (
        <span className="text-xs px-1.5 py-0.5 rounded font-medium inline-flex items-center gap-1" style={{ background: `${config.color}18`, color: config.color }}>
            {config.emoji} {config.label}
        </span>
    );
}

function ProgressBar({ pct, color, isActive }: { pct: number; color: string; isActive: boolean }) {
    return (
        <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: isActive ? color : `${color}60` }} />
        </div>
    );
}

function GoalCard({ goal, onDelete }: { goal: Goal; onDelete: (id: string) => void }) {
    const config = METRIC_CONFIG[goal.metric];
    const Icon = config.icon;
    const monthName = goal.month ? MONTHS[goal.month - 1] : null;
    const periodLabel = goal.period === "annual" ? `${goal.year}` : `${monthName} ${goal.year}`;
    const isCompleted = goal.pct >= 100;
    const remaining = Math.max(goal.target - goal.current, 0);

    return (
        <div className={cn("bg-dark-800 border rounded-2xl p-5 transition-all", isCompleted ? "border-green-500/30" : goal.isActive ? "border-white/8" : "border-white/5 opacity-70")}>
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${config.color}18` }}>
                        {isCompleted ? <Check className="w-5 h-5 text-green-400" /> : <Icon className="w-5 h-5" style={{ color: config.color }} />}
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-white">{config.label}</p>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium", goal.period === "annual" ? "bg-purple-500/15 text-purple-400" : "bg-brand-500/15 text-brand-400")}>
                                {goal.period === "annual" ? "Anual" : "Mensal"}
                            </span>
                            <span className="text-xs text-neutral-500">{periodLabel}</span>
                            <GroupBadge group={goal.activityGroup} />
                        </div>
                    </div>
                </div>
                <button onClick={() => onDelete(goal.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-600 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>

            <div className="mb-3">
                <div className="flex items-end justify-between mb-2">
                    <div>
                        <span className="text-2xl font-display font-bold text-white">{goal.current.toFixed(goal.metric === "activities_count" ? 0 : 1)}</span>
                        <span className="text-sm text-neutral-500 ml-1">{config.unit}</span>
                    </div>
                    <div className="text-right">
                        <span className={cn("text-lg font-display font-bold", isCompleted ? "text-green-400" : "text-white")}>{goal.pct}%</span>
                        <p className="text-xs text-neutral-500">de {goal.target}{config.unit ? ` ${config.unit}` : ""}</p>
                    </div>
                </div>
                <ProgressBar pct={goal.pct} color={isCompleted ? "#22c55e" : config.color} isActive={goal.isActive} />
            </div>

            {isCompleted ? (
                <p className="text-xs text-green-400 font-medium flex items-center gap-1"><Check className="w-3 h-3" /> Objetivo concluído! 🎉</p>
            ) : goal.isActive ? (
                <p className="text-xs text-neutral-500">
                    Faltam <span className="text-white font-semibold">{remaining.toFixed(goal.metric === "activities_count" ? 0 : 1)}{config.unit ? ` ${config.unit}` : ""}</span> para atingir o objetivo
                </p>
            ) : (
                <p className="text-xs text-neutral-600">Período encerrado</p>
            )}
        </div>
    );
}

function SuggestionCard({ suggestion, onAccept, onDismiss, accepting }: {
    suggestion: Suggestion;
    onAccept: (s: Suggestion) => void;
    onDismiss: (s: Suggestion) => void;
    accepting: boolean;
}) {
    const config = METRIC_CONFIG[suggestion.metric];
    const Icon = config.icon;
    const monthName = suggestion.month ? MONTHS[suggestion.month - 1] : null;
    const periodLabel = suggestion.period === "annual" ? `${suggestion.year}` : `${monthName} ${suggestion.year}`;
    const groupConfig = ACTIVITY_GROUPS[suggestion.activityGroup];

    return (
        <div className="bg-dark-800 border border-brand-500/20 rounded-2xl p-4 relative overflow-hidden">
            <div className="absolute inset-0 opacity-5" style={{ background: `radial-gradient(circle at top right, ${config.color}, transparent 60%)` }} />
            <div className="relative">
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${config.color}18` }}>
                            <Icon className="w-4 h-4" style={{ color: config.color }} />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-sm font-semibold text-white">{config.label}</p>
                                <span className="text-xs bg-brand-500/15 text-brand-400 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                                    <TrendingUp className="w-2.5 h-2.5" />{suggestion.boost}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-xs text-neutral-500">{periodLabel}</span>
                                {groupConfig && groupConfig.label !== "Todos" && (
                                    <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: `${groupConfig.color}18`, color: groupConfig.color }}>
                                        {groupConfig.emoji} {groupConfig.label}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-lg font-display font-bold text-white">
                            {suggestion.target}{config.unit ? ` ${config.unit}` : ""}
                        </p>
                    </div>
                </div>
                <p className="text-xs text-neutral-500 mb-3 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-brand-400 shrink-0" />
                    {suggestion.reason}
                </p>
                <div className="flex gap-2">
                    <button onClick={() => onDismiss(suggestion)} className="flex-1 py-2 rounded-lg bg-dark-700 border border-white/8 text-neutral-400 hover:text-white text-xs transition-all">Ignorar</button>
                    <button onClick={() => onAccept(suggestion)} disabled={accepting} className="flex-1 py-2 rounded-lg text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50" style={{ background: "linear-gradient(135deg, #2B8FBF, #1A5A80)" }}>
                        {accepting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        Aceitar
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function GoalsClient({ userId }: { userId: string }) {
    const [goals, setGoals] = useState<Goal[]>([]);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);
    const [dominantGroup, setDominantGroup] = useState<ActivityGroup>("all");
    const [loading, setLoading] = useState(true);
    const [loadingSuggestions, setLoadingSuggestions] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [acceptingId, setAcceptingId] = useState<string | null>(null);
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [filterGroup, setFilterGroup] = useState<string>("all");

    const [form, setForm] = useState({
        metric: "distance_km" as Metric,
        period: "monthly" as Period,
        target: "",
        year: currentYear,
        month: currentMonth,
        activityGroup: "all" as ActivityGroup,
    });

    const fetchGoals = useCallback(async () => {
        setLoading(true);
        const res = await fetch(`/api/goals?year=${selectedYear}`);
        if (res.ok) setGoals(await res.json());
        setLoading(false);
    }, [selectedYear]);

    const fetchSuggestions = useCallback(async () => {
        setLoadingSuggestions(true);
        const res = await fetch("/api/goals/suggestions");
        if (res.ok) {
            const data = await res.json();
            setSuggestions(data.suggestions ?? []);
            // Pré-seleciona o desporto dominante como default do form
            if (data.dominantGroup && data.dominantGroup !== "all") {
                setDominantGroup(data.dominantGroup as ActivityGroup);
                setForm((prev) => ({ ...prev, activityGroup: data.dominantGroup as ActivityGroup }));
            }
        }
        setLoadingSuggestions(false);
    }, []);

    useEffect(() => { fetchGoals(); }, [fetchGoals]);
    useEffect(() => { fetchSuggestions(); }, [fetchSuggestions]);

    const suggestionKey = (s: Suggestion) => `${s.metric}-${s.period}-${s.year}-${s.month}-${s.activityGroup}`;
    const visibleSuggestions = suggestions.filter((s) => !dismissedSuggestions.includes(suggestionKey(s)));
    const suggestionGroups = [...new Set(visibleSuggestions.map((s) => s.activityGroup))];

    const handleAcceptSuggestion = async (suggestion: Suggestion) => {
        const key = suggestionKey(suggestion);
        setAcceptingId(key);
        const res = await fetch("/api/goals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(suggestion),
        });
        if (res.ok) {
            setDismissedSuggestions((prev) => [...prev, key]);
            fetchGoals();
        }
        setAcceptingId(null);
    };

    const handleDismissSuggestion = (suggestion: Suggestion) => {
        setDismissedSuggestions((prev) => [...prev, suggestionKey(suggestion)]);
    };

    const handleCreate = async () => {
        if (!form.target || parseFloat(form.target) <= 0) return;
        setSaving(true);
        const res = await fetch("/api/goals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                metric: form.metric,
                period: form.period,
                target: parseFloat(form.target),
                year: form.year,
                month: form.period === "monthly" ? form.month : null,
                activityGroup: form.activityGroup,
            }),
        });
        setSaving(false);
        if (res.ok) {
            setShowForm(false);
            setForm({ metric: "distance_km", period: "monthly", target: "", year: currentYear, month: currentMonth, activityGroup: dominantGroup });
            fetchGoals();
            fetchSuggestions();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Eliminar este objetivo?")) return;
        await fetch(`/api/goals?id=${id}`, { method: "DELETE" });
        fetchGoals();
        fetchSuggestions();
    };

    const filteredGoals = filterGroup === "all" ? goals : goals.filter((g) => g.activityGroup === filterGroup);
    const activeGoals = filteredGoals.filter((g) => g.isActive);
    const pastMonthlyGoals = filteredGoals.filter((g) => g.period === "monthly" && !g.isActive);
    const annualGoals = filteredGoals.filter((g) => g.period === "annual");
    const goalGroups = [...new Set(goals.map((g) => g.activityGroup ?? "all"))];

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between animate-fade-up">
                <div>
                    <h1 className="font-display text-3xl text-white tracking-wide">OBJETIVOS</h1>
                    <p className="text-neutral-500 text-sm mt-0.5">
                        Metas mensais e anuais por desporto
                        {dominantGroup !== "all" && (
                            <span className="ml-1.5 text-xs">
                                · Desporto principal: <span style={{ color: ACTIVITY_GROUPS[dominantGroup]?.color }}>{ACTIVITY_GROUPS[dominantGroup]?.emoji} {ACTIVITY_GROUPS[dominantGroup]?.label}</span>
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="appearance-none bg-dark-800 border border-white/10 text-white text-xs rounded-xl pl-3 pr-8 py-2.5 focus:outline-none focus:border-brand-500 cursor-pointer">
                            {[currentYear - 1, currentYear, currentYear + 1].map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500 pointer-events-none" />
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-all"
                        style={{ background: "linear-gradient(135deg, #2B8FBF, #1A5A80)" }}
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Novo Objetivo</span>
                    </button>
                </div>
            </div>

            {/* Sugestões */}
            {!loadingSuggestions && visibleSuggestions.length > 0 && (
                <div className="animate-fade-up delay-100">
                    <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-brand-400" />
                        <p className="text-sm font-semibold text-white">Sugestões para ti</p>
                        {suggestionGroups.length > 1 && (
                            <span className="text-xs text-neutral-500">{suggestionGroups.length} desportos detetados</span>
                        )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {visibleSuggestions.map((suggestion) => {
                            const key = suggestionKey(suggestion);
                            return (
                                <SuggestionCard key={key} suggestion={suggestion} onAccept={handleAcceptSuggestion} onDismiss={handleDismissSuggestion} accepting={acceptingId === key} />
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Filtro por desporto */}
            {!loading && goals.length > 0 && goalGroups.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none animate-fade-up">
                    {["all", ...goalGroups.filter((g) => g !== "all")].map((group) => {
                        const cfg = ACTIVITY_GROUPS[group as string];
                        if (!cfg) return null;
                        return (
                            <button key={group} onClick={() => setFilterGroup(group as string)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 border", filterGroup === group ? "bg-brand-500/15 border-brand-500/30 text-brand-300" : "bg-dark-800 border-white/8 text-neutral-500 hover:text-white")}>
                                {cfg.emoji} {cfg.label}
                            </button>
                        );
                    })}
                </div>
            )}

            {loading && <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>}

            {/* Empty state */}
            {!loading && goals.length === 0 && visibleSuggestions.length === 0 && (
                <div className="animate-fade-up bg-dark-800 border border-white/5 rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: "linear-gradient(135deg, rgba(43,143,191,0.2), rgba(232,23,122,0.2))" }}>
                        <Target className="w-8 h-8 text-brand-400" />
                    </div>
                    <p className="text-white font-semibold text-lg mb-2">Sem objetivos para {selectedYear}</p>
                    <p className="text-neutral-500 text-sm mb-6">Define metas de distância, tempo ou nº de atividades por desporto.</p>
                    <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 text-sm font-semibold text-white px-5 py-2.5 rounded-xl" style={{ background: "linear-gradient(135deg, #2B8FBF, #1A5A80)" }}>
                        <Plus className="w-4 h-4" /> Criar primeiro objetivo
                    </button>
                </div>
            )}

            {!loading && activeGoals.length > 0 && (
                <div className="animate-fade-up delay-200">
                    <p className="text-xs text-neutral-500 uppercase tracking-wider mb-3">Em curso</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {activeGoals.map((goal) => <GoalCard key={goal.id} goal={goal} onDelete={handleDelete} />)}
                    </div>
                </div>
            )}

            {!loading && annualGoals.length > 0 && (
                <div className="animate-fade-up delay-300">
                    <p className="text-xs text-neutral-500 uppercase tracking-wider mb-3">Anuais — {selectedYear}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {annualGoals.map((goal) => <GoalCard key={goal.id} goal={goal} onDelete={handleDelete} />)}
                    </div>
                </div>
            )}

            {!loading && pastMonthlyGoals.length > 0 && (
                <div className="animate-fade-up delay-400">
                    <p className="text-xs text-neutral-500 uppercase tracking-wider mb-3">Meses anteriores</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {pastMonthlyGoals.map((goal) => <GoalCard key={goal.id} goal={goal} onDelete={handleDelete} />)}
                    </div>
                </div>
            )}

            {/* Modal de criação */}
            {showForm && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-dark-800 border border-white/10 rounded-2xl w-full max-w-md animate-fade-up max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-brand-500/15 rounded-lg flex items-center justify-center">
                                    <Target className="w-4 h-4 text-brand-400" />
                                </div>
                                <h3 className="font-semibold text-white">Novo Objetivo</h3>
                            </div>
                            <button onClick={() => setShowForm(false)} className="text-neutral-500 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* Desporto */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs text-neutral-400 uppercase tracking-wider">Desporto</label>
                                    {dominantGroup !== "all" && (
                                        <span className="text-xs text-neutral-500 flex items-center gap-1">
                                            <Sparkles className="w-3 h-3 text-brand-400" />
                                            Pré-selecionado com base no teu historial
                                        </span>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(ACTIVITY_GROUPS).map(([key, cfg]) => (
                                        <button
                                            key={key}
                                            onClick={() => setForm({ ...form, activityGroup: key as ActivityGroup })}
                                            className={cn(
                                                "py-2.5 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-1.5",
                                                form.activityGroup === key
                                                    ? "border-brand-500/40 bg-brand-500/10 text-white"
                                                    : "border-white/8 bg-dark-700 text-neutral-400 hover:border-white/15 hover:text-white"
                                            )}
                                        >
                                            {cfg.emoji} {cfg.label}
                                            {key === dominantGroup && key !== "all" && (
                                                <span className="text-xs text-brand-400">★</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Métrica */}
                            <div>
                                <label className="text-xs text-neutral-400 uppercase tracking-wider mb-2 block">Métrica</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(Object.entries(METRIC_CONFIG) as [Metric, typeof METRIC_CONFIG[Metric]][]).map(([key, cfg]) => {
                                        const Icon = cfg.icon;
                                        return (
                                            <button key={key} onClick={() => setForm({ ...form, metric: key })} className={cn("flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all", form.metric === key ? "border-brand-500/40 bg-brand-500/10 text-white" : "border-white/8 bg-dark-700 text-neutral-400 hover:border-white/15 hover:text-white")}>
                                                <Icon className="w-4 h-4" style={{ color: form.metric === key ? cfg.color : undefined }} />
                                                {cfg.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Período */}
                            <div>
                                <label className="text-xs text-neutral-400 uppercase tracking-wider mb-2 block">Período</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(["monthly", "annual"] as Period[]).map((p) => (
                                        <button key={p} onClick={() => setForm({ ...form, period: p })} className={cn("py-2.5 rounded-xl border text-sm font-medium transition-all", form.period === p ? "border-brand-500/40 bg-brand-500/10 text-white" : "border-white/8 bg-dark-700 text-neutral-400 hover:border-white/15 hover:text-white")}>
                                            {p === "monthly" ? "Mensal" : "Anual"}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Mês/Ano */}
                            {form.period === "monthly" && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">Mês</label>
                                        <div className="relative">
                                            <select value={form.month} onChange={(e) => setForm({ ...form, month: parseInt(e.target.value) })} className="w-full appearance-none bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 pr-8">
                                                {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">Ano</label>
                                        <div className="relative">
                                            <select value={form.year} onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })} className="w-full appearance-none bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 pr-8">
                                                {[currentYear - 1, currentYear, currentYear + 1].map((y) => <option key={y} value={y}>{y}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {form.period === "annual" && (
                                <div>
                                    <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">Ano</label>
                                    <div className="relative">
                                        <select value={form.year} onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })} className="w-full appearance-none bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 pr-8">
                                            {[currentYear - 1, currentYear, currentYear + 1].map((y) => <option key={y} value={y}>{y}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500 pointer-events-none" />
                                    </div>
                                </div>
                            )}

                            {/* Target */}
                            <div>
                                <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">
                                    Objetivo {METRIC_CONFIG[form.metric].unit ? `(${METRIC_CONFIG[form.metric].unit})` : ""}
                                </label>
                                <input
                                    type="number"
                                    value={form.target}
                                    onChange={(e) => setForm({ ...form, target: e.target.value })}
                                    placeholder={METRIC_CONFIG[form.metric].placeholder}
                                    className="w-full bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-brand-500 transition-colors font-mono"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 p-5 pt-0">
                            <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl bg-dark-700 border border-white/8 text-neutral-400 hover:text-white text-sm transition-all">Cancelar</button>
                            <button onClick={handleCreate} disabled={saving || !form.target} className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: "linear-gradient(135deg, #2B8FBF, #1A5A80)" }}>
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
                                Criar Objetivo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}