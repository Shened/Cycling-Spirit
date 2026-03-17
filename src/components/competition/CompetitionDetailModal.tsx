"use client";
import {
    X, Trophy, Target, Calendar, Users, Crown,
    TrendingUp, Medal
} from "lucide-react";
import { format, parseISO, isAfter, isBefore } from "date-fns";
import { pt } from "date-fns/locale";
import { metricLabel, cn } from "@/lib/utils";

interface CompetitionUser { id: string; name: string; avatar?: string | null }
interface CompetitionEntry { userId: string; value: number; user: CompetitionUser }
interface CompetitionInvite { id: string; userId: string; status: string; user: CompetitionUser }

interface Competition {
    id: string; title: string; description?: string | null;
    metric: string; startDate: string; endDate: string;
    createdById: string; status: string; teamId?: string | null;
    team?: { id: string; name: string } | null;
    createdBy: { id: string; name: string };
    invites: CompetitionInvite[];
    entries: CompetitionEntry[];
}

interface Props {
    competition: Competition;
    userId: string;
    onClose: () => void;
}

function getStatus(c: Competition) {
    const now = new Date();
    const start = parseISO(c.startDate);
    const end = parseISO(c.endDate);
    if (isBefore(now, start)) return { label: "Em breve", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" };
    if (isAfter(now, end)) return { label: "Terminada", color: "text-neutral-500 bg-neutral-500/10 border-neutral-500/20" };
    return { label: "A decorrer", color: "text-green-400 bg-green-400/10 border-green-400/20" };
}

const POSITION_STYLES = [
    "bg-yellow-500/20 text-yellow-400",
    "bg-neutral-400/20 text-neutral-300",
    "bg-amber-700/20 text-amber-600",
];

export default function CompetitionDetailModal({ competition, userId, onClose }: Props) {
    const sorted = [...competition.entries].sort((a, b) => b.value - a.value);
    const status = getStatus(competition);
    const myRank = sorted.findIndex((e) => e.userId === userId) + 1;
    const myEntry = sorted.find((e) => e.userId === userId);
    const acceptedInvites = competition.invites.filter((i) => i.status === "accepted");
    const pendingInvites = competition.invites.filter((i) => i.status === "pending");

    const metricUnit = {
        distance_km: "km",
        elevation_m: "m",
        avg_speed: "km/h",
        duration_hours: "h",
        activities_count: "",
    }[competition.metric] ?? "";

    return (
        <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-dark-800 border border-white/10 rounded-2xl w-full max-w-lg animate-fade-up max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-white/5">
                    <div className="flex items-center gap-4">
                        <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                            style={{ background: "linear-gradient(135deg, rgba(43,143,191,0.3), rgba(232,23,122,0.3))" }}
                        >
                            <Trophy className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="font-bold text-white text-lg">{competition.title}</h2>
                                <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", status.color)}>
                                    {status.label}
                                </span>
                            </div>
                            {competition.description && (
                                <p className="text-sm text-neutral-400 mt-0.5">{competition.description}</p>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="text-neutral-500 hover:text-white shrink-0">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Info */}
                <div className="px-6 py-4 border-b border-white/5 grid grid-cols-3 gap-4">
                    <div>
                        <p className="text-xs text-neutral-500 flex items-center gap-1 mb-1">
                            <Target className="w-3 h-3" /> Objetivo
                        </p>
                        <p className="text-sm font-medium text-white">{metricLabel(competition.metric)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-neutral-500 flex items-center gap-1 mb-1">
                            <Calendar className="w-3 h-3" /> Período
                        </p>
                        <p className="text-sm font-medium text-white">
                            {format(parseISO(competition.startDate), "d MMM", { locale: pt })} →{" "}
                            {format(parseISO(competition.endDate), "d MMM", { locale: pt })}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-neutral-500 flex items-center gap-1 mb-1">
                            <Users className="w-3 h-3" /> Participantes
                        </p>
                        <p className="text-sm font-medium text-white">
                            {sorted.length}
                            {pendingInvites.length > 0 && (
                                <span className="text-xs text-yellow-400 ml-1">+{pendingInvites.length} pendentes</span>
                            )}
                        </p>
                    </div>
                </div>

                {/* A minha posição */}
                {myEntry && myRank > 0 && (
                    <div className="mx-6 mt-4 p-4 rounded-xl bg-brand-500/8 border border-brand-500/15 flex items-center gap-4">
                        <div className="text-3xl font-display text-gradient">{myRank}º</div>
                        <div>
                            <p className="text-xs text-neutral-500">A tua posição</p>
                            <p className="text-lg font-mono font-bold text-white">
                                {myEntry.value.toFixed(1)} {metricUnit}
                            </p>
                        </div>
                        {myRank === 1 && <Crown className="w-6 h-6 text-yellow-400 ml-auto" />}
                        {myRank === 2 && <Medal className="w-6 h-6 text-neutral-300 ml-auto" />}
                        {myRank === 3 && <Medal className="w-6 h-6 text-amber-600 ml-auto" />}
                    </div>
                )}

                {/* Classificação completa */}
                <div className="p-6">
                    <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">
                        Classificação Completa
                    </p>
                    {sorted.length === 0 ? (
                        <div className="text-center py-8">
                            <TrendingUp className="w-8 h-8 text-neutral-700 mx-auto mb-2" />
                            <p className="text-neutral-500 text-sm">Sem resultados ainda.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {sorted.map((entry, idx) => (
                                <div
                                    key={entry.userId}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-xl",
                                        entry.userId === userId
                                            ? "bg-brand-500/8 border border-brand-500/15"
                                            : "bg-dark-700"
                                    )}
                                >
                                    <div className={cn(
                                        "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                                        idx < 3 ? POSITION_STYLES[idx] : "bg-dark-600 text-neutral-500"
                                    )}>
                                        {idx === 0 ? <Crown className="w-3.5 h-3.5" /> : idx + 1}
                                    </div>
                                    <span className={cn(
                                        "text-sm flex-1 truncate font-medium",
                                        entry.userId === userId ? "text-brand-300" : "text-white"
                                    )}>
                                        {entry.user.name}
                                        {entry.userId === userId && <span className="text-xs text-neutral-500 ml-1">(tu)</span>}
                                    </span>
                                    <span className="text-sm font-mono font-bold text-brand-400">
                                        {entry.value.toFixed(1)} {metricUnit}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Convidados */}
                {acceptedInvites.length > 0 && (
                    <div className="px-6 pb-6">
                        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">
                            Convidados
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {acceptedInvites.map((invite) => (
                                <span key={invite.id} className="flex items-center gap-1.5 bg-dark-700 border border-white/8 text-neutral-300 text-xs px-2.5 py-1 rounded-full">
                                    {invite.user.name}
                                </span>
                            ))}
                            {pendingInvites.map((invite) => (
                                <span key={invite.id} className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs px-2.5 py-1 rounded-full">
                                    {invite.user.name} • pendente
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}