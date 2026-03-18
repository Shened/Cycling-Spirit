// src/components/activity/ActivityDetailClient.tsx

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Bike, Clock, Mountain, Flame, Zap, Wind,
    Heart, ChevronLeft, Trash2, MapPin, Calendar,
    Activity, Loader2
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { formatDuration, activityTypeEmoji, activityTypeLabel, cn } from "@/lib/utils";
import dynamic from "next/dynamic";

const ActivityMap = dynamic(() => import("./ActivityMap"), { ssr: false });

interface ActivityDetail {
    id: string;
    title: string;
    type: string;
    distanceKm: number;
    durationSeconds: number;
    elevationM?: number | null;
    avgWatts?: number | null;
    avgHeartRate?: number | null;
    avgSpeedKmh?: number | null;
    calories?: number | null;
    polyline?: string | null;
    isManual: boolean;
    startedAt: string;
}

const STATS = [
    {
        key: "distanceKm",
        icon: Bike,
        color: "#2B8FBF",
        label: "Distância",
        format: (v: number) => `${v.toFixed(2)} km`,
    },
    {
        key: "durationSeconds",
        icon: Clock,
        color: "#3AADD4",
        label: "Duração",
        format: (v: number) => formatDuration(v),
    },
    {
        key: "elevationM",
        icon: Mountain,
        color: "#8B9FE8",
        label: "Subida",
        format: (v: number) => `${v} m`,
    },
    {
        key: "avgSpeedKmh",
        icon: Wind,
        color: "#60cfe8",
        label: "Vel. Média",
        format: (v: number) => `${v.toFixed(1)} km/h`,
    },
    {
        key: "avgWatts",
        icon: Zap,
        color: "#facc15",
        label: "Watts Médios",
        format: (v: number) => `${v} w`,
    },
    {
        key: "avgHeartRate",
        icon: Heart,
        color: "#ed4d99",
        label: "FC Média",
        format: (v: number) => `${Math.round(v)} bpm`,
    },
    {
        key: "calories",
        icon: Flame,
        color: "#E8177A",
        label: "Calorias",
        format: (v: number) => `${v} kcal`,
    },
];

export default function ActivityDetailClient({ activity }: { activity: ActivityDetail }) {
    const router = useRouter();
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        if (!confirm("Eliminar esta atividade? Esta ação não pode ser revertida.")) return;
        setDeleting(true);
        await fetch(`/api/activities/${activity.id}`, { method: "DELETE" });
        router.push("/activities");
    };

    const activeStats = STATS.filter(({ key }) => {
        const val = activity[key as keyof ActivityDetail];
        return val !== null && val !== undefined && val !== 0;
    });

    // Calcula pace para corridas/caminhadas
    const showPace = ["run", "trail_run", "walk", "hike"].includes(activity.type);
    const paceSecsPerKm = activity.distanceKm > 0
        ? activity.durationSeconds / activity.distanceKm
        : null;
    const paceStr = paceSecsPerKm
        ? `${Math.floor(paceSecsPerKm / 60)}:${String(Math.floor(paceSecsPerKm % 60)).padStart(2, "0")} /km`
        : null;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Back + header */}
            <div className="flex items-start justify-between gap-4 animate-fade-up">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-dark-800 border border-white/8 text-neutral-400 hover:text-white hover:border-white/20 transition-all shrink-0"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-2xl">{activityTypeEmoji(activity.type)}</span>
                            <h1 className="font-display text-2xl text-white tracking-wide">{activity.title}</h1>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs text-neutral-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(activity.startedAt), "EEEE, d 'de' MMMM yyyy 'às' HH:mm", { locale: pt })}
                            </span>
                            <span className="text-neutral-700">·</span>
                            <span className="text-xs text-neutral-500 flex items-center gap-1">
                                <Activity className="w-3 h-3" />
                                {activityTypeLabel(activity.type)}
                            </span>
                            {!activity.isManual && (
                                <>
                                    <span className="text-neutral-700">·</span>
                                    <span className="text-xs text-[#FC4C02] font-medium">Strava</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {activity.isManual && (
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-sm px-3 h-9 rounded-xl transition-all disabled:opacity-50 shrink-0"
                    >
                        {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        <span className="hidden sm:inline">Eliminar</span>
                    </button>
                )}
            </div>

            {/* Mapa */}
            {activity.polyline ? (
                <div className="animate-fade-up delay-100 bg-dark-800 border border-white/5 rounded-2xl overflow-hidden">
                    <div className="h-80 sm:h-96 w-full">
                        <ActivityMap polyline={activity.polyline} />
                    </div>
                </div>
            ) : (
                <div className="animate-fade-up delay-100 bg-dark-800 border border-white/5 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-3">
                    <div className="w-12 h-12 bg-dark-700 rounded-xl flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-neutral-600" />
                    </div>
                    <p className="text-neutral-500 text-sm">Sem dados de GPS para esta atividade</p>
                </div>
            )}

            {/* Stats grid */}
            <div className="animate-fade-up delay-200 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {activeStats.map(({ key, icon: Icon, color, label, format: fmt }) => {
                    const val = activity[key as keyof ActivityDetail] as number;
                    return (
                        <div
                            key={key}
                            className="bg-dark-800 border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-all"
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                    style={{ background: `${color}18` }}
                                >
                                    <Icon className="w-4 h-4" style={{ color }} />
                                </div>
                                <p className="text-xs text-neutral-500">{label}</p>
                            </div>
                            <p className="text-xl font-display font-bold text-white tracking-wide">
                                {fmt(val)}
                            </p>
                        </div>
                    );
                })}

                {/* Pace (corridas) */}
                {showPace && paceStr && (
                    <div className="bg-dark-800 border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-all">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-green-500/10">
                                <Activity className="w-4 h-4 text-green-400" />
                            </div>
                            <p className="text-xs text-neutral-500">Pace</p>
                        </div>
                        <p className="text-xl font-display font-bold text-white tracking-wide">{paceStr}</p>
                    </div>
                )}
            </div>

            {/* Info extra */}
            <div className="animate-fade-up delay-300 bg-dark-800 border border-white/5 rounded-2xl p-5">
                <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-4">Detalhes</h2>
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-500">Tipo</span>
                        <span className="text-white font-medium flex items-center gap-1.5">
                            {activityTypeEmoji(activity.type)} {activityTypeLabel(activity.type)}
                        </span>
                    </div>
                    <div className="h-px bg-white/5" />
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-500">Data</span>
                        <span className="text-white font-medium">
                            {format(new Date(activity.startedAt), "d 'de' MMMM yyyy", { locale: pt })}
                        </span>
                    </div>
                    <div className="h-px bg-white/5" />
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-500">Hora</span>
                        <span className="text-white font-medium">
                            {format(new Date(activity.startedAt), "HH:mm")}
                        </span>
                    </div>
                    <div className="h-px bg-white/5" />
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-500">Fonte</span>
                        <span className={cn("font-medium", activity.isManual ? "text-neutral-400" : "text-[#FC4C02]")}>
                            {activity.isManual ? "Manual" : "Strava"}
                        </span>
                    </div>
                    <div className="h-px bg-white/5" />
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-500">Rota GPS</span>
                        <span className={cn("font-medium flex items-center gap-1", activity.polyline ? "text-brand-400" : "text-neutral-600")}>
                            <MapPin className="w-3.5 h-3.5" />
                            {activity.polyline ? "Disponível" : "Indisponível"}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}