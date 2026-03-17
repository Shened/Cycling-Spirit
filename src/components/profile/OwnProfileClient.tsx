"use client";
import { useState, useEffect } from "react";
import {
    Bike, Clock, Mountain, BarChart2, Users,
    Settings, Activity, Zap, Trophy, UserCheck,
    Medal, TrendingUp, Star, MapPin, Timer
} from "lucide-react";
import Link from "next/link";
import {
    AreaChart, Area, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid
} from "recharts";
import { formatDuration, activityTypeEmoji, cn } from "@/lib/utils";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface Props {
    user: {
        id: string; name: string; email: string; avatar?: string | null;
        ftpWatts?: number | null; weightKg?: number | null; stravaId?: string | null;
        createdAt: Date;
        teamMemberships: { role: string; team: { id: string; name: string; slug: string } }[];
        _count: { sentFriendships: number; receivedFriendships: number };
    };
}

interface Stats {
    totalKm: number; totalHours: number;
    totalActivities: number; totalElevation: number;
    avgWatts: number; avgSpeed: number;
}

interface Activity {
    id: string; title: string; type: string;
    distanceKm: number; durationSeconds: number;
    elevationM?: number | null; startedAt: string;
    isManual: boolean;
}

interface SegmentEffort {
    id: string; segmentId: string; segmentName: string;
    distanceM: number; elapsedSeconds: number; startDate: string;
    komRank?: number | null; prRank?: number | null;
    avgGrade?: number | null; city?: string | null;
}

interface PersonalRecord {
    longestDistanceKm: number;
    highestElevationM: number;
    fastestSpeedKmh: number;
    highestWatts: number;
    longestDurationSecs: number;
}

interface KomStats {
    totalKoms: number;
    totalTop10: number;
    total: number;
}

export default function OwnProfileClient({ user }: Props) {
    const [stats, setStats] = useState<Stats | null>(null);
    const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
    const [weeklyKm, setWeeklyKm] = useState<{ week: string; km: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [efforts, setEfforts] = useState<SegmentEffort[]>([]);
    const [pr, setPr] = useState<PersonalRecord | null>(null);
    const [komStats, setKomStats] = useState<KomStats | null>(null);
    const [komFilter, setKomFilter] = useState<"all" | "koms" | "top10">("koms");
    const [loadingKoms, setLoadingKoms] = useState(true);
    const totalFriends = user._count.sentFriendships + user._count.receivedFriendships;

    useEffect(() => {
        const fetchData = async () => {
            const res = await fetch("/api/dashboard?period=month");
            if (res.ok) {
                const data = await res.json();
                setStats({
                    totalKm: data.totalKm, totalHours: data.totalHours,
                    totalActivities: data.totalActivities, totalElevation: data.totalElevation,
                    avgWatts: data.avgWatts, avgSpeed: data.avgSpeed,
                });
                setRecentActivities(data.recentActivities);
                setWeeklyKm(data.weeklyKm);
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (!user.stravaId) { setLoadingKoms(false); return; }
        const fetchKoms = async () => {
            setLoadingKoms(true);
            const res = await fetch(`/api/strava/koms?filter=${komFilter}`);
            if (res.ok) {
                const data = await res.json();
                setEfforts(data.efforts ?? []);
                setPr(data.personalRecord ?? null);
                setKomStats(data.stats ?? null);
            }
            setLoadingKoms(false);
        };
        fetchKoms();
    }, [user.stravaId, komFilter]);

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="animate-fade-up">
                <h1 className="font-display text-3xl text-white tracking-wide">MEU PERFIL</h1>
                <p className="text-neutral-500 text-sm mt-0.5">A tua página pública</p>
            </div>

            {/* Profile card */}
            <div className="animate-fade-up delay-100 bg-dark-800 border border-white/5 rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4">
                        <div
                            className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold shrink-0"
                            style={{ background: "linear-gradient(135deg, rgba(43,143,191,0.3), rgba(232,23,122,0.3))" }}
                        >
                            {user.avatar ? (
                                <img src={user.avatar} alt={user.name} className="w-full h-full rounded-2xl object-cover" />
                            ) : (
                                <span className="text-white">{user.name.charAt(0).toUpperCase()}</span>
                            )}
                        </div>
                        <div>
                            <h2 className="font-display text-2xl text-white tracking-wide">{user.name.toUpperCase()}</h2>
                            <p className="text-sm text-neutral-500">{user.email}</p>
                            <p className="text-xs text-neutral-600 mt-1">
                                Membro desde {format(new Date(user.createdAt), "MMMM yyyy", { locale: pt })}
                            </p>
                            {user.stravaId && (
                                <span className="inline-flex items-center gap-1.5 mt-2 text-xs bg-[#FC4C02]/10 border border-[#FC4C02]/20 text-[#FC4C02] px-2 py-0.5 rounded-full">
                                    <Activity className="w-3 h-3" /> Strava ligado
                                </span>
                            )}
                        </div>
                    </div>
                    <Link
                        href="/settings"
                        className="flex items-center gap-2 bg-dark-700 border border-white/10 text-neutral-400 hover:text-white hover:border-white/20 text-sm px-4 py-2.5 rounded-xl transition-all"
                    >
                        <Settings className="w-4 h-4" /> Editar perfil
                    </Link>
                </div>

                {/* Quick info */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/5">
                    <div className="text-center">
                        <p className="text-xl font-bold text-white font-mono">{totalFriends}</p>
                        <p className="text-xs text-neutral-500 flex items-center justify-center gap-1 mt-0.5">
                            <UserCheck className="w-3 h-3" /> Amigos
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-xl font-bold text-white font-mono">{user.teamMemberships.length}</p>
                        <p className="text-xs text-neutral-500 flex items-center justify-center gap-1 mt-0.5">
                            <Users className="w-3 h-3" /> Equipas
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-xl font-bold text-white font-mono">{komStats?.totalKoms ?? "—"}</p>
                        <p className="text-xs text-neutral-500 flex items-center justify-center gap-1 mt-0.5">
                            <Trophy className="w-3 h-3" /> KOMs
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-xl font-bold text-white font-mono">{komStats?.totalTop10 ?? "—"}</p>
                        <p className="text-xs text-neutral-500 flex items-center justify-center gap-1 mt-0.5">
                            <Medal className="w-3 h-3" /> Top 10
                        </p>
                    </div>
                </div>
            </div>

            {/* Personal Records */}
            {pr && (
                <div className="animate-fade-up delay-200 bg-dark-800 border border-white/5 rounded-2xl p-6">
                    <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-400" /> Records Pessoais
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[
                            { icon: Bike, color: "#2B8FBF", label: "Maior Distância", value: `${pr.longestDistanceKm.toFixed(1)} km` },
                            { icon: Mountain, color: "#8B9FE8", label: "Maior Subida Total", value: `${pr.highestElevationM.toLocaleString()} m` },
                            { icon: TrendingUp, color: "#60cfe8", label: "Maior Velocidade Média", value: `${pr.fastestSpeedKmh.toFixed(1)} km/h` },
                            { icon: Zap, color: "#3AADD4", label: "Maior Potência Média", value: pr.highestWatts ? `${pr.highestWatts} w` : "—" },
                            { icon: Timer, color: "#1fb8a0", label: "Maior Duração", value: formatDuration(pr.longestDurationSecs) },
                        ].map(({ icon: Icon, color, label, value }) => (
                            <div key={label} className="bg-dark-700 border border-white/5 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon className="w-4 h-4 shrink-0" style={{ color }} />
                                    <p className="text-xs text-neutral-500">{label}</p>
                                </div>
                                <p className="text-lg font-bold font-mono text-white">{value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* KOMs & Top 10 */}
            {user.stravaId && (
                <div className="animate-fade-up delay-300 bg-dark-800 border border-white/5 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                        <h2 className="font-semibold text-white flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-yellow-400" /> Segmentos Strava
                        </h2>
                        <div className="flex items-center gap-1 bg-dark-700 border border-white/5 rounded-xl p-1">
                            {[
                                { value: "koms", label: "🥇 KOMs" },
                                { value: "top10", label: "🏅 Top 10" },
                                { value: "all", label: "Todos" },
                            ].map(({ value, label }) => (
                                <button
                                    key={value}
                                    onClick={() => setKomFilter(value as typeof komFilter)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                        komFilter === value
                                            ? "bg-brand-500/20 text-white border border-brand-500/30"
                                            : "text-neutral-500 hover:text-neutral-200"
                                    )}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {loadingKoms ? (
                        <div className="flex justify-center py-8">
                            <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : efforts.length === 0 ? (
                        <div className="text-center py-10">
                            <Trophy className="w-8 h-8 text-neutral-700 mx-auto mb-2" />
                            <p className="text-neutral-500 text-sm">
                                {komFilter === "koms" ? "Sem KOMs ainda — vai lá ganhar alguns! 🚴" :
                                    komFilter === "top10" ? "Sem Top 10 ainda." : "Sem segmentos sincronizados."}
                            </p>
                            <p className="text-neutral-600 text-xs mt-1">Faz Sync Strava no dashboard para atualizar.</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {efforts.map((effort) => (
                                <a

                                    key={effort.id}
                                    href={`https://www.strava.com/segments/${effort.segmentId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-3 bg-dark-700 rounded-xl border border-white/5 hover:border-white/10 transition-all group"
                                >
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0",
                                        effort.komRank === 1
                                            ? "bg-yellow-500/20 text-yellow-400"
                                            : "bg-brand-500/15 text-brand-400"
                                    )}>
                                        {effort.komRank === 1 ? "🥇" : `#${effort.prRank ?? "—"}`}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate group-hover:text-brand-300 transition-colors">
                                            {effort.segmentName}
                                        </p>
                                        <div className="flex items-center gap-3 text-xs text-neutral-500 mt-0.5">
                                            {effort.city && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" /> {effort.city}
                                                </span>
                                            )}
                                            <span>{(effort.distanceM / 1000).toFixed(1)} km</span>
                                            {effort.avgGrade && <span>{effort.avgGrade.toFixed(1)}%</span>}
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-sm font-mono font-bold text-white">{formatDuration(effort.elapsedSeconds)}</p>
                                        <p className="text-xs text-neutral-500">
                                            {format(new Date(effort.startDate), "d MMM yyyy", { locale: pt })}
                                        </p>
                                    </div>
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            )
            }

            {/* Stats this month */}
            {
                !loading && stats && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 animate-fade-up delay-400">
                        {[
                            { icon: Bike, color: "#2B8FBF", label: "Distância", value: `${stats.totalKm} km` },
                            { icon: Clock, color: "#3AADD4", label: "Tempo", value: formatDuration(stats.totalHours * 3600) },
                            { icon: BarChart2, color: "#1fb8a0", label: "Atividades", value: String(stats.totalActivities) },
                            { icon: Mountain, color: "#8B9FE8", label: "Subida Total", value: `${stats.totalElevation}m` },
                            { icon: Zap, color: "#3AADD4", label: "Watts Médios", value: stats.avgWatts ? `${stats.avgWatts}w` : "—" },
                            { icon: Activity, color: "#60cfe8", label: "Vel. Média", value: stats.avgSpeed ? `${stats.avgSpeed} km/h` : "—" },
                        ].map(({ icon: Icon, color, label, value }) => (
                            <div key={label} className="bg-dark-800 border border-white/5 rounded-2xl p-5">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}18` }}>
                                    <Icon className="w-4 h-4" style={{ color }} />
                                </div>
                                <p className="text-xl font-bold text-white font-mono">{value}</p>
                                <p className="text-xs text-neutral-500 mt-0.5">{label} este mês</p>
                            </div>
                        ))}
                    </div>
                )
            }

            {/* Weekly chart */}
            {
                !loading && weeklyKm.length > 0 && (
                    <div className="animate-fade-up delay-500 bg-dark-800 border border-white/5 rounded-2xl p-6">
                        <h2 className="font-semibold text-white mb-1">Km por Semana</h2>
                        <p className="text-xs text-neutral-500 mb-5">Últimas 8 semanas</p>
                        <ResponsiveContainer width="100%" height={180}>
                            <AreaChart data={weeklyKm} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
                                <defs>
                                    <linearGradient id="gradOwn" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#2B8FBF" stopOpacity={0.25} />
                                        <stop offset="100%" stopColor="#2B8FBF" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                                <XAxis dataKey="week" tick={{ fill: "#737373", fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: "#737373", fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ background: "#1C2533", border: "1px solid rgba(43,143,191,0.2)", borderRadius: "12px", color: "#fff", fontSize: 12 }} />
                                <Area type="monotone" dataKey="km" stroke="#2B8FBF" strokeWidth={2} fill="url(#gradOwn)" dot={{ fill: "#2B8FBF", r: 3, strokeWidth: 0 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )
            }

            {/* Recent activities */}
            {
                !loading && recentActivities.length > 0 && (
                    <div className="animate-fade-up delay-600 bg-dark-800 border border-white/5 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold text-white">Atividades Recentes</h2>
                            <Link href="/activities" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                                Ver todas →
                            </Link>
                        </div>
                        <div className="space-y-2">
                            {recentActivities.map((act) => (
                                <div key={act.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/3 transition-colors">
                                    <div className="w-9 h-9 bg-dark-700 rounded-xl flex items-center justify-center text-base shrink-0">
                                        {activityTypeEmoji(act.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">{act.title}</p>
                                        <p className="text-xs text-neutral-500 flex items-center gap-1.5">
                                            {format(new Date(act.startedAt), "d 'de' MMM yyyy", { locale: pt })}
                                            {!act.isManual && <span className="text-[#FC4C02]">• Strava</span>}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-sm font-mono font-semibold text-white">{act.distanceKm.toFixed(1)} km</p>
                                        <p className="text-xs text-neutral-500">{formatDuration(act.durationSeconds)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }

            {/* Teams */}
            {
                user.teamMemberships.length > 0 && (
                    <div className="animate-fade-up delay-600 bg-dark-800 border border-white/5 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold text-white">Equipas</h2>
                            <Link href="/teams" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                                Ver todas →
                            </Link>
                        </div>
                        <div className="space-y-2">
                            {user.teamMemberships.map(({ team, role }) => (
                                <div key={team.id} className="flex items-center gap-3 p-3 bg-dark-700 rounded-xl border border-white/5">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                        style={{ background: "linear-gradient(135deg, rgba(43,143,191,0.3), rgba(232,23,122,0.3))" }}>
                                        <span className="text-white text-xs font-bold">{team.name.charAt(0).toUpperCase()}</span>
                                    </div>
                                    <p className="text-sm font-medium text-white flex-1">{team.name}</p>
                                    <span className="text-xs text-neutral-500 bg-dark-600 px-2 py-0.5 rounded-full capitalize">
                                        {role === "owner" ? "Manager" : role}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }
        </div >
    );
}