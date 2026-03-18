// src/components/goals/GoalsWidget.tsx
// Widget compacto para mostrar no dashboard

"use client";
import { useState, useEffect } from "react";
import { Target, Bike, Clock, BarChart2, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Metric = "distance_km" | "duration_hours" | "activities_count";
type Period = "monthly" | "annual";

interface Goal {
    id: string;
    metric: Metric;
    period: Period;
    target: number;
    year: number;
    month: number | null;
    current: number;
    pct: number;
    isActive: boolean;
}

const METRIC_CONFIG: Record<Metric, { label: string; icon: React.ElementType; unit: string; color: string }> = {
    distance_km: { label: "Distância", icon: Bike, unit: "km", color: "#2B8FBF" },
    duration_hours: { label: "Tempo", icon: Clock, unit: "h", color: "#3AADD4" },
    activities_count: { label: "Atividades", icon: BarChart2, unit: "", color: "#1fb8a0" },
};

export default function GoalsWidget() {
    const [goals, setGoals] = useState<Goal[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGoals = async () => {
            const res = await fetch(`/api/goals?year=${new Date().getFullYear()}`);
            if (res.ok) {
                const data: Goal[] = await res.json();
                // Só mostra objetivos ativos no widget
                setGoals(data.filter((g) => g.isActive).slice(0, 4));
            }
            setLoading(false);
        };
        fetchGoals();
    }, []);

    if (loading) return null;
    if (goals.length === 0) return (
        <div className="animate-fade-up bg-dark-800 border border-white/5 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-white flex items-center gap-2">
                    <Target className="w-4 h-4 text-brand-400" /> Objetivos
                </h2>
                <Link href="/goals" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                    Definir →
                </Link>
            </div>
            <p className="text-sm text-neutral-500 text-center py-4">
                Sem objetivos ativos. <Link href="/goals" className="text-brand-400 hover:text-brand-300">Criar agora →</Link>
            </p>
        </div>
    );

    return (
        <div className="animate-fade-up bg-dark-800 border border-white/5 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-white flex items-center gap-2">
                    <Target className="w-4 h-4 text-brand-400" /> Objetivos
                </h2>
                <Link href="/goals" className="text-xs text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1">
                    Ver todos <ChevronRight className="w-3 h-3" />
                </Link>
            </div>

            <div className="space-y-4">
                {goals.map((goal) => {
                    const config = METRIC_CONFIG[goal.metric];
                    const Icon = config.icon;
                    const isCompleted = goal.pct >= 100;
                    const periodLabel = goal.period === "annual" ? "Anual" : "Mensal";

                    return (
                        <div key={goal.id}>
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                    <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: config.color }} />
                                    <span className="text-sm text-white font-medium">{config.label}</span>
                                    <span className={cn(
                                        "text-xs px-1.5 py-0.5 rounded font-medium",
                                        goal.period === "annual" ? "bg-purple-500/15 text-purple-400" : "bg-brand-500/15 text-brand-400"
                                    )}>
                                        {periodLabel}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className={cn(
                                        "text-sm font-mono font-bold",
                                        isCompleted ? "text-green-400" : "text-white"
                                    )}>
                                        {goal.pct}%
                                    </span>
                                </div>
                            </div>

                            {/* Barra de progresso */}
                            <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden mb-1">
                                <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{
                                        width: `${goal.pct}%`,
                                        background: isCompleted ? "#22c55e" : config.color,
                                    }}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-xs text-neutral-500">
                                    {goal.current.toFixed(goal.metric === "activities_count" ? 0 : 1)}{config.unit ? ` ${config.unit}` : ""}
                                </span>
                                <span className="text-xs text-neutral-600">
                                    {goal.target}{config.unit ? ` ${config.unit}` : ""}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}