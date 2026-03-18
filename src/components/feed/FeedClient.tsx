// src/components/feed/FeedClient.tsx

"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
    Bike, Clock, Mountain, Flame, Zap, Wind,
    Heart, Users, Loader2, RefreshCw, UserPlus
} from "lucide-react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { formatDuration, activityTypeEmoji, cn } from "@/lib/utils";
import dynamic from "next/dynamic";

const ActivityMap = dynamic(() => import("@/components/activity/ActivityMap"), { ssr: false });

interface User {
    id: string;
    name: string;
    avatar?: string | null;
}

interface FeedActivity {
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
    userId: string;
    user: User;
}

interface Props {
    currentUser: User;
}

const STAT_CONFIG = [
    { key: "distanceKm", icon: Bike, color: "#2B8FBF", label: "km", format: (v: number) => v.toFixed(1) },
    { key: "durationSeconds", icon: Clock, color: "#3AADD4", label: "", format: (v: number) => formatDuration(v) },
    { key: "elevationM", icon: Mountain, color: "#8B9FE8", label: "m", format: (v: number) => `${v}` },
    { key: "avgSpeedKmh", icon: Wind, color: "#60cfe8", label: "km/h", format: (v: number) => v.toFixed(1) },
    { key: "avgWatts", icon: Zap, color: "#facc15", label: "w", format: (v: number) => `${v}` },
    { key: "avgHeartRate", icon: Heart, color: "#ed4d99", label: "bpm", format: (v: number) => `${Math.round(v)}` },
    { key: "calories", icon: Flame, color: "#E8177A", label: "kcal", format: (v: number) => `${v}` },
];

function ActivityCard({ activity, currentUser }: { activity: FeedActivity; currentUser: User }) {
    const [expanded, setExpanded] = useState(false);
    const isOwn = activity.userId === currentUser.id;

    const stats = STAT_CONFIG.filter(({ key }) => {
        const val = activity[key as keyof FeedActivity];
        return val !== null && val !== undefined && val !== 0;
    });

    return (
        <article className="bg-dark-800 border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-all animate-fade-up">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 pb-3">
                <Link href={isOwn ? "/profile" : `/profile/${activity.userId}`}>
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden text-sm font-bold hover:opacity-80 transition-opacity"
                        style={{ background: "linear-gradient(135deg, rgba(43,143,191,0.35), rgba(232,23,122,0.35))" }}
                    >
                        {activity.user.avatar ? (
                            <img src={activity.user.avatar} alt={activity.user.name} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-brand-300">{activity.user.name.charAt(0).toUpperCase()}</span>
                        )}
                    </div>
                </Link>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Link
                            href={isOwn ? "/profile" : `/profile/${activity.userId}`}
                            className="text-sm font-semibold text-white hover:text-brand-300 transition-colors"
                        >
                            {isOwn ? "Tu" : activity.user.name}
                        </Link>
                        <span className="text-neutral-500 text-xs">registou uma atividade</span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5">
                        {formatDistanceToNow(new Date(activity.startedAt), { addSuffix: true, locale: pt })}
                        {!activity.isManual && (
                            <span className="ml-1.5 text-[#FC4C02]">• Strava</span>
                        )}
                    </p>
                </div>
                <div className="text-2xl shrink-0">{activityTypeEmoji(activity.type)}</div>
            </div>

            {/* Title */}
            <div className="px-4 pb-3">
                <h3 className="font-semibold text-white text-base leading-snug">{activity.title}</h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                    {format(new Date(activity.startedAt), "EEEE, d 'de' MMMM 'às' HH:mm", { locale: pt })}
                </p>
            </div>

            {/* Map (se tiver polyline) */}
            {activity.polyline && (
                <div
                    className={cn(
                        "w-full overflow-hidden transition-all duration-300",
                        expanded ? "h-64" : "h-40 cursor-pointer"
                    )}
                    onClick={() => setExpanded((v) => !v)}
                >
                    <ActivityMap polyline={activity.polyline} />
                </div>
            )}

            {/* Stats */}
            <div className="px-4 py-3 border-t border-white/5">
                <div className="flex items-center gap-4 flex-wrap">
                    {stats.slice(0, 4).map(({ key, icon: Icon, color, label, format: fmt }) => {
                        const val = activity[key as keyof FeedActivity] as number;
                        return (
                            <div key={key} className="flex items-center gap-1.5">
                                <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
                                <span className="text-sm font-mono font-semibold text-white">{fmt(val)}</span>
                                {label && <span className="text-xs text-neutral-500">{label}</span>}
                            </div>
                        );
                    })}
                </div>
            </div>
        </article>
    );
}

export default function FeedClient({ currentUser }: Props) {
    const [activities, setActivities] = useState<FeedActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [friendCount, setFriendCount] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const loaderRef = useRef<HTMLDivElement>(null);

    const fetchFeed = useCallback(async (cursor?: string, append = false) => {
        if (!append) setLoading(true);
        else setLoadingMore(true);

        const params = new URLSearchParams();
        if (cursor) params.set("cursor", cursor);

        const res = await fetch(`/api/feed?${params}`);
        if (res.ok) {
            const data = await res.json();
            setActivities((prev) => append ? [...prev, ...data.activities] : data.activities);
            setNextCursor(data.nextCursor);
            setFriendCount(data.friendCount);
        }

        setLoading(false);
        setLoadingMore(false);
    }, []);

    useEffect(() => { fetchFeed(); }, [fetchFeed]);

    // Infinite scroll com IntersectionObserver
    useEffect(() => {
        if (!loaderRef.current || !nextCursor) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && nextCursor && !loadingMore) {
                    fetchFeed(nextCursor, true);
                }
            },
            { threshold: 0.5 }
        );
        observer.observe(loaderRef.current);
        return () => observer.disconnect();
    }, [nextCursor, loadingMore, fetchFeed]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchFeed();
        setRefreshing(false);
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between animate-fade-up">
                <div>
                    <h1 className="font-display text-3xl text-white tracking-wide">FEED</h1>
                    <p className="text-neutral-500 text-sm mt-0.5">
                        {friendCount > 0
                            ? `Atividades tuas e dos teus ${friendCount} amigo${friendCount !== 1 ? "s" : ""}`
                            : "Atividades recentes"
                        }
                    </p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center gap-2 bg-dark-800 border border-white/10 text-neutral-400 hover:text-white hover:border-white/20 text-sm px-3 h-9 rounded-xl transition-all disabled:opacity-50"
                >
                    <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
                    <span className="hidden sm:inline text-xs">Atualizar</span>
                </button>
            </div>

            {/* Empty state — sem amigos */}
            {!loading && friendCount === 0 && (
                <div className="animate-fade-up bg-dark-800 border border-white/5 rounded-2xl p-12 text-center">
                    <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                        style={{ background: "linear-gradient(135deg, rgba(43,143,191,0.2), rgba(232,23,122,0.2))" }}
                    >
                        <Users className="w-8 h-8 text-brand-400" />
                    </div>
                    <p className="text-white font-semibold text-lg mb-2">Ainda não tens amigos</p>
                    <p className="text-neutral-500 text-sm mb-6 max-w-xs mx-auto">
                        Adiciona amigos para ver as atividades deles aqui no feed.
                    </p>
                    <Link
                        href="/profile"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-white px-5 py-2.5 rounded-xl transition-all"
                        style={{ background: "linear-gradient(135deg, #2B8FBF, #1A5A80)" }}
                    >
                        <UserPlus className="w-4 h-4" />
                        Encontrar amigos
                    </Link>
                </div>
            )}

            {/* Empty state — sem atividades */}
            {!loading && friendCount > 0 && activities.length === 0 && (
                <div className="animate-fade-up bg-dark-800 border border-white/5 rounded-2xl p-12 text-center">
                    <div className="text-5xl mb-4">🚴</div>
                    <p className="text-white font-semibold mb-1">Nenhuma atividade ainda</p>
                    <p className="text-neutral-500 text-sm">
                        As atividades dos teus amigos vão aparecer aqui.
                    </p>
                </div>
            )}

            {/* Loading skeleton */}
            {loading && (
                <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="bg-dark-800 border border-white/5 rounded-2xl p-4 animate-pulse">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-dark-700 rounded-xl" />
                                <div className="space-y-2 flex-1">
                                    <div className="h-3 bg-dark-700 rounded w-32" />
                                    <div className="h-2.5 bg-dark-700 rounded w-24" />
                                </div>
                            </div>
                            <div className="h-4 bg-dark-700 rounded w-3/4 mb-3" />
                            <div className="h-36 bg-dark-700 rounded-xl mb-3" />
                            <div className="flex gap-4">
                                {[1, 2, 3].map((j) => <div key={j} className="h-3 bg-dark-700 rounded w-16" />)}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Feed */}
            {!loading && activities.length > 0 && (
                <div className="space-y-4">
                    {activities.map((activity) => (
                        <ActivityCard key={activity.id} activity={activity} currentUser={currentUser} />
                    ))}
                </div>
            )}

            {/* Infinite scroll trigger */}
            <div ref={loaderRef} className="flex justify-center py-4">
                {loadingMore && <Loader2 className="w-5 h-5 animate-spin text-neutral-500" />}
                {!loadingMore && !nextCursor && activities.length > 0 && (
                    <p className="text-xs text-neutral-600">Chegaste ao início do feed</p>
                )}
            </div>
        </div>
    );
}