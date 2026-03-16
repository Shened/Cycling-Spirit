"use client";
import { useState, useEffect } from "react";
import {
    UserPlus, UserCheck, UserX, Clock, Bike,
    Mountain, BarChart2, Users, Loader2, ChevronLeft
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
    AreaChart, Area, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid
} from "recharts";
import { formatDuration, activityTypeEmoji, cn } from "@/lib/utils";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface UserProfile {
    id: string;
    name: string;
    avatar?: string | null;
    createdAt: string;
    teamMemberships: { role: string; team: { id: string; name: string; slug: string } }[];
}

interface Stats {
    totalKm: number;
    totalHours: number;
    totalActivities: number;
    totalElevation: number;
}

interface Activity {
    id: string; title: string; type: string;
    distanceKm: number; durationSeconds: number;
    elevationM?: number | null; startedAt: string;
}

interface PendingRequest {
    id: string; senderId: string; status: string;
}

interface ProfileData {
    user: UserProfile;
    isFriend: boolean;
    pendingRequest: PendingRequest | null;
    stats: Stats | null;
    recentActivities: Activity[];
    weeklyKm: { week: string; km: number }[];
}

export default function ProfileClient({ userId, currentUserId }: { userId: string; currentUserId: string }) {
    const router = useRouter();
    const [data, setData] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchProfile = async () => {
        setLoading(true);
        const res = await fetch(`/api/users/${userId}`);
        if (res.ok) setData(await res.json());
        setLoading(false);
    };

    useEffect(() => { fetchProfile(); }, [userId]);

    const sendRequest = async () => {
        setActionLoading(true);
        await fetch("/api/friends", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ receiverId: userId }),
        });
        await fetchProfile();
        setActionLoading(false);
    };

    const respondRequest = async (id: string, status: "accepted" | "declined") => {
        setActionLoading(true);
        await fetch(`/api/friends/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        });
        await fetchProfile();
        setActionLoading(false);
    };

    const removeFriend = async (friendshipId: string) => {
        if (!confirm("Remover esta amizade?")) return;
        setActionLoading(true);
        await fetch(`/api/friends/${friendshipId}`, { method: "DELETE" });
        await fetchProfile();
        setActionLoading(false);
    };

    if (loading) return (
        <div className="flex items-center justify-center py-32">
            <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
        </div>
    );

    if (!data) return (
        <div className="text-center py-32 text-neutral-500">Utilizador não encontrado.</div>
    );

    const { user, isFriend, pendingRequest, stats, recentActivities, weeklyKm } = data;
    const iSentRequest = pendingRequest?.senderId === currentUserId;
    const theysentRequest = pendingRequest?.senderId === userId;

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Back */}
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-neutral-500 hover:text-white text-sm transition-colors animate-fade-up"
            >
                <ChevronLeft className="w-4 h-4" /> Voltar
            </button>

            {/* Profile header */}
            <div className="animate-fade-up delay-100 bg-dark-800 border border-white/5 rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4">
                        <div
                            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shrink-0"
                            style={{ background: "linear-gradient(135deg, rgba(43,143,191,0.3), rgba(232,23,122,0.3))" }}
                        >
                            {user.avatar ? (
                                <img src={user.avatar} alt={user.name} className="w-full h-full rounded-2xl object-cover" />
                            ) : (
                                <span className="text-white">{user.name.charAt(0).toUpperCase()}</span>
                            )}
                        </div>
                        <div>
                            <h1 className="font-display text-2xl text-white tracking-wide">{user.name.toUpperCase()}</h1>
                            <p className="text-sm text-neutral-500 mt-0.5">
                                Membro desde {format(new Date(user.createdAt), "MMMM yyyy", { locale: pt })}
                            </p>
                            {isFriend && (
                                <span className="inline-flex items-center gap-1.5 mt-1.5 text-xs bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                                    <UserCheck className="w-3 h-3" /> Amigos
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Friend action buttons */}
                    <div className="flex items-center gap-2">
                        {!isFriend && !pendingRequest && (
                            <button
                                onClick={sendRequest}
                                disabled={actionLoading}
                                className="flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-all disabled:opacity-50"
                            >
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                                Adicionar amigo
                            </button>
                        )}

                        {pendingRequest && iSentRequest && (
                            <button
                                onClick={() => removeFriend(pendingRequest.id)}
                                disabled={actionLoading}
                                className="flex items-center gap-2 bg-dark-700 border border-white/10 text-neutral-400 hover:text-white text-sm px-4 py-2.5 rounded-xl transition-all disabled:opacity-50"
                            >
                                <Clock className="w-4 h-4" /> Pedido enviado
                            </button>
                        )}

                        {pendingRequest && theysentRequest && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => respondRequest(pendingRequest.id, "accepted")}
                                    disabled={actionLoading}
                                    className="flex items-center gap-2 bg-green-500/15 border border-green-500/30 text-green-400 hover:bg-green-500/25 text-sm px-4 py-2.5 rounded-xl transition-all disabled:opacity-50"
                                >
                                    <UserCheck className="w-4 h-4" /> Aceitar
                                </button>
                                <button
                                    onClick={() => respondRequest(pendingRequest.id, "declined")}
                                    disabled={actionLoading}
                                    className="flex items-center gap-2 bg-dark-700 border border-white/10 text-neutral-400 hover:text-red-400 text-sm px-4 py-2.5 rounded-xl transition-all disabled:opacity-50"
                                >
                                    <UserX className="w-4 h-4" /> Recusar
                                </button>
                            </div>
                        )}

                        {isFriend && (
                            <button
                                onClick={async () => {
                                    // Busca o friendshipId
                                    const res = await fetch("/api/friends");
                                    const d = await res.json();
                                    const f = d.accepted.find((f: { sender: { id: string }; receiver: { id: string }; id: string }) =>
                                        f.sender.id === userId || f.receiver.id === userId
                                    );
                                    if (f) removeFriend(f.id);
                                }}
                                className="flex items-center gap-2 bg-dark-700 border border-white/10 text-neutral-400 hover:text-red-400 hover:border-red-500/20 text-sm px-4 py-2.5 rounded-xl transition-all"
                            >
                                <UserX className="w-4 h-4" /> Remover amigo
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Not friends message */}
            {!isFriend && (
                <div className="animate-fade-up delay-200 bg-dark-800 border border-white/5 rounded-2xl p-10 text-center">
                    <div className="w-14 h-14 bg-dark-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Users className="w-7 h-7 text-neutral-600" />
                    </div>
                    <p className="text-white font-semibold mb-1">Perfil privado</p>
                    <p className="text-neutral-500 text-sm">Adiciona {user.name} como amigo para ver as suas estatísticas e atividades.</p>
                </div>
            )}

            {/* Stats — só amigos */}
            {isFriend && stats && (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fade-up delay-200">
                        {[
                            { icon: Bike, color: "#2B8FBF", label: "Distância", value: `${stats.totalKm} km` },
                            { icon: Clock, color: "#3AADD4", label: "Horas", value: `${stats.totalHours}h` },
                            { icon: BarChart2, color: "#1fb8a0", label: "Atividades", value: String(stats.totalActivities) },
                            { icon: Mountain, color: "#8B9FE8", label: "Subida", value: `${stats.totalElevation}m` },
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

                    {/* Weekly chart */}
                    <div className="animate-fade-up delay-300 bg-dark-800 border border-white/5 rounded-2xl p-6">
                        <h2 className="font-semibold text-white mb-1">Km por Semana</h2>
                        <p className="text-xs text-neutral-500 mb-5">Últimas 8 semanas</p>
                        <ResponsiveContainer width="100%" height={180}>
                            <AreaChart data={weeklyKm} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
                                <defs>
                                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#2B8FBF" stopOpacity={0.25} />
                                        <stop offset="100%" stopColor="#2B8FBF" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                                <XAxis dataKey="week" tick={{ fill: "#737373", fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: "#737373", fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ background: "#1C2533", border: "1px solid rgba(43,143,191,0.2)", borderRadius: "12px", color: "#fff", fontSize: 12 }} />
                                <Area type="monotone" dataKey="km" stroke="#2B8FBF" strokeWidth={2} fill="url(#grad)" dot={{ fill: "#2B8FBF", r: 3, strokeWidth: 0 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Recent activities */}
                    {recentActivities.length > 0 && (
                        <div className="animate-fade-up delay-400 bg-dark-800 border border-white/5 rounded-2xl p-6">
                            <h2 className="font-semibold text-white mb-4">Atividades Recentes</h2>
                            <div className="space-y-2">
                                {recentActivities.map((act) => (
                                    <div key={act.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/3 transition-colors">
                                        <div className="w-9 h-9 bg-dark-700 rounded-xl flex items-center justify-center text-base shrink-0">
                                            {activityTypeEmoji(act.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-white truncate">{act.title}</p>
                                            <p className="text-xs text-neutral-500">
                                                {format(new Date(act.startedAt), "d 'de' MMM yyyy", { locale: pt })}
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
                    )}

                    {/* Teams */}
                    {user.teamMemberships.length > 0 && (
                        <div className="animate-fade-up delay-500 bg-dark-800 border border-white/5 rounded-2xl p-6">
                            <h2 className="font-semibold text-white mb-4">Equipas</h2>
                            <div className="space-y-2">
                                {user.teamMemberships.map(({ team, role }) => (
                                    <div key={team.id} className="flex items-center gap-3 p-3 bg-dark-700 rounded-xl border border-white/5">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                            style={{ background: "linear-gradient(135deg, rgba(43,143,191,0.3), rgba(232,23,122,0.3))" }}>
                                            <span className="text-white text-xs font-bold">{team.name.charAt(0).toUpperCase()}</span>
                                        </div>
                                        <p className="text-sm font-medium text-white flex-1">{team.name}</p>
                                        <span className="text-xs text-neutral-500 bg-dark-600 px-2 py-0.5 rounded-full capitalize">{role}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}