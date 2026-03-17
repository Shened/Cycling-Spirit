"use client";
import { useState, useEffect, useCallback } from "react";
import {
    Users, UserPlus, Mail, Trophy, Flag, BarChart2,
    ChevronLeft, Loader2, X, Check, Crown, Shield,
    UserX, Settings, Clock, AlertCircle, Copy, CheckCircle
} from "lucide-react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import { cn, metricLabel } from "@/lib/utils";

type TeamRole = "owner" | "admin" | "member";

interface TeamUser { id: string; name: string; email: string; avatar?: string | null }
interface TeamMember { userId: string; role: TeamRole; joinedAt: string; user: TeamUser }
interface TeamInvitation { id: string; email: string; token: string; createdAt: string; expiresAt: string; invitedBy: { id: string; name: string } }
interface JoinRequest { id: string; message?: string | null; createdAt: string; user: TeamUser }
interface PendingCompetition { id: string; title: string; metric: string; startDate: string; endDate: string; createdBy: { id: string; name: string } }
interface Tour { id: string; name: string; type: string; status: string; startDate: string; endDate: string; _count: { participants: number; stages: number } }

interface TeamData {
    id: string; name: string; description?: string | null;
    ownerId: string;
    owner: TeamUser;
    members: TeamMember[];
    invitations: TeamInvitation[];
    joinRequests: JoinRequest[];
    competitions: PendingCompetition[];
    tours: Tour[];
    _count: { members: number; competitions: number; tours: number };
}

interface Props {
    teamId: string;
    currentUserId: string;
    currentUserRole: string;
}

const ROLE_LABELS: Record<string, string> = { owner: "Manager", admin: "Admin", member: "Membro" };
const ROLE_ICONS: Record<string, React.ElementType> = { owner: Crown, admin: Shield, member: Users };
const STATUS_COLORS: Record<string, string> = {
    upcoming: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    active: "text-green-400 bg-green-400/10 border-green-400/20",
    finished: "text-neutral-500 bg-neutral-500/10 border-neutral-500/20",
};

export default function TeamManageClient({ teamId, currentUserId, currentUserRole }: Props) {
    const router = useRouter();
    const [team, setTeam] = useState<TeamData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"members" | "invites" | "requests" | "competitions" | "tours" | "stats">("members");
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteLink, setInviteLink] = useState("");
    const [copied, setCopied] = useState(false);
    const [inviting, setInviting] = useState(false);

    const isOwner = currentUserRole === "owner";

    const fetchTeam = useCallback(async () => {
        setLoading(true);
        const res = await fetch(`/api/teams/${teamId}`);
        if (res.ok) setTeam(await res.json());
        setLoading(false);
    }, [teamId]);

    useEffect(() => { fetchTeam(); }, [fetchTeam]);

    const updateRole = async (userId: string, role: "member" | "admin") => {
        setActionLoading(userId);
        await fetch(`/api/teams/${teamId}/members`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, role }),
        });
        setActionLoading(null);
        fetchTeam();
    };

    const removeMember = async (userId: string) => {
        if (!confirm("Remover este membro da equipa?")) return;
        setActionLoading(userId);
        await fetch(`/api/teams/${teamId}/members`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId }),
        });
        setActionLoading(null);
        fetchTeam();
    };

    const sendInvite = async () => {
        if (!inviteEmail) return;
        setInviting(true);
        const res = await fetch(`/api/teams/${teamId}/invite`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: inviteEmail }),
        });
        const data = await res.json();
        if (res.ok && data.inviteUrl) {
            setInviteLink(data.inviteUrl);
            setInviteEmail("");
            fetchTeam();
        }
        setInviting(false);
    };

    const cancelInvite = async (inviteId: string) => {
        setActionLoading(inviteId);
        await fetch(`/api/teams/${teamId}/invite/${inviteId}`, { method: "DELETE" });
        setActionLoading(null);
        fetchTeam();
    };

    const respondJoinRequest = async (requestId: string, status: "accepted" | "declined") => {
        setActionLoading(requestId);
        await fetch(`/api/teams/${teamId}/join`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ requestId, status }),
        });
        setActionLoading(null);
        fetchTeam();
    };

    const respondCompetition = async (id: string, status: "approved" | "rejected") => {
        setActionLoading(id);
        await fetch(`/api/competitions/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        });
        setActionLoading(null);
        fetchTeam();
    };

    const copyLink = () => {
        navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) return (
        <div className="flex items-center justify-center py-32">
            <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
        </div>
    );

    if (!team) return (
        <div className="text-center py-32 text-neutral-500">Equipa não encontrada.</div>
    );

    const TABS = [
        { key: "members", label: "Membros", icon: Users, badge: team.members.length },
        { key: "invites", label: "Convites", icon: Mail, badge: team.invitations.length },
        { key: "requests", label: "Pedidos", icon: UserPlus, badge: team.joinRequests.length },
        { key: "competitions", label: "Competições", icon: Trophy, badge: team.competitions.length },
        { key: "tours", label: "Tours", icon: Flag, badge: team.tours.length },
        { key: "stats", label: "Estatísticas", icon: BarChart2, badge: 0 },
    ];

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 animate-fade-up">
                <button
                    onClick={() => router.push("/teams")}
                    className="flex items-center gap-2 text-neutral-500 hover:text-white text-sm transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" /> Equipas
                </button>
                <div className="h-4 w-px bg-white/10" />
                <div className="flex items-center gap-3 flex-1">
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: "linear-gradient(135deg, rgba(43,143,191,0.3), rgba(232,23,122,0.3))" }}
                    >
                        <span className="text-white font-bold">{team.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                        <h1 className="font-display text-2xl text-white tracking-wide">{team.name.toUpperCase()}</h1>
                        <p className="text-xs text-neutral-500">Gestão da equipa</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {[
                        team.joinRequests.length > 0 && { label: `${team.joinRequests.length} pedidos`, color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
                        team.competitions.length > 0 && { label: `${team.competitions.length} competições pendentes`, color: "text-brand-400 bg-brand-400/10 border-brand-400/20" },
                    ].filter(Boolean).map((badge: { label: string; color: string } | false, i) => badge && (
                        <span key={i} className={cn("text-xs px-2.5 py-1 rounded-full border font-medium", badge.color)}>
                            {badge.label}
                        </span>
                    ))}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-dark-800 border border-white/5 rounded-xl p-1 overflow-x-auto animate-fade-up delay-100">
                {TABS.map(({ key, label, icon: Icon, badge }) => (
                    <button
                        key={key}
                        onClick={() => setActiveTab(key as typeof activeTab)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                            activeTab === key ? "bg-brand-500/20 text-white border border-brand-500/30" : "text-neutral-500 hover:text-neutral-200"
                        )}
                    >
                        <Icon className="w-4 h-4" />
                        {label}
                        {badge > 0 && (
                            <span className={cn(
                                "text-xs px-1.5 py-0.5 rounded-full font-bold",
                                activeTab === key ? "bg-brand-500/30 text-brand-200" : "bg-dark-600 text-neutral-400"
                            )}>
                                {badge}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── Members ── */}
            {activeTab === "members" && (
                <div className="animate-fade-up bg-dark-800 border border-white/5 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                        <h2 className="font-semibold text-white">Membros ({team.members.length})</h2>
                    </div>
                    <div className="divide-y divide-white/5">
                        {team.members.map((member) => {
                            const RoleIcon = ROLE_ICONS[member.role] ?? Users;
                            const isMe = member.userId === currentUserId;
                            const isTeamOwner = member.userId === team.ownerId;
                            return (
                                <div key={member.userId} className="flex items-center gap-4 px-6 py-4">
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                        style={{ background: "linear-gradient(135deg, rgba(43,143,191,0.2), rgba(232,23,122,0.2))" }}
                                    >
                                        <span className="text-white font-bold text-sm">{member.user.name.charAt(0).toUpperCase()}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-semibold text-white truncate">{member.user.name}</p>
                                            {isMe && <span className="text-xs text-neutral-500">(tu)</span>}
                                        </div>
                                        <p className="text-xs text-neutral-500 truncate">{member.user.email}</p>
                                        <p className="text-xs text-neutral-600 mt-0.5">
                                            Desde {format(new Date(member.joinedAt), "d 'de' MMM yyyy", { locale: pt })}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        {/* Role badge */}
                                        <div className={cn(
                                            "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border",
                                            isTeamOwner ? "text-brand-400 bg-brand-400/10 border-brand-400/20" :
                                                member.role === "admin" ? "text-blue-400 bg-blue-400/10 border-blue-400/20" :
                                                    "text-neutral-500 bg-neutral-500/10 border-neutral-500/20"
                                        )}>
                                            <RoleIcon className="w-3 h-3" />
                                            {ROLE_LABELS[member.role]}
                                        </div>

                                        {/* Role actions (owner only, not for themselves or team owner) */}
                                        {isOwner && !isMe && !isTeamOwner && (
                                            <div className="flex items-center gap-1">
                                                {member.role === "member" && (
                                                    <button
                                                        onClick={() => updateRole(member.userId, "admin")}
                                                        disabled={actionLoading === member.userId}
                                                        className="text-xs bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50"
                                                    >
                                                        {actionLoading === member.userId ? <Loader2 className="w-3 h-3 animate-spin" /> : "→ Admin"}
                                                    </button>
                                                )}
                                                {member.role === "admin" && (
                                                    <button
                                                        onClick={() => updateRole(member.userId, "member")}
                                                        disabled={actionLoading === member.userId}
                                                        className="text-xs bg-dark-700 border border-white/10 text-neutral-400 hover:text-white px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50"
                                                    >
                                                        {actionLoading === member.userId ? <Loader2 className="w-3 h-3 animate-spin" /> : "→ Membro"}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => removeMember(member.userId)}
                                                    disabled={actionLoading === member.userId}
                                                    className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-all disabled:opacity-50"
                                                >
                                                    <UserX className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Invites ── */}
            {activeTab === "invites" && (
                <div className="space-y-4 animate-fade-up">
                    {/* Send invite */}
                    <div className="bg-dark-800 border border-white/5 rounded-2xl p-6">
                        <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
                            <UserPlus className="w-4 h-4 text-brand-400" /> Convidar por Email
                        </h2>
                        <div className="flex gap-2">
                            <input
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="email@exemplo.com"
                                className="flex-1 bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-brand-500"
                            />
                            <button
                                onClick={sendInvite}
                                disabled={inviting || !inviteEmail}
                                className="flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white font-semibold text-sm px-4 rounded-xl transition-all disabled:opacity-50"
                            >
                                {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                Enviar
                            </button>
                        </div>
                        {inviteLink && (
                            <div className="mt-3 flex items-center gap-2 bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5">
                                <p className="text-xs text-neutral-400 flex-1 truncate">{inviteLink}</p>
                                <button onClick={copyLink} className="shrink-0 text-neutral-400 hover:text-white transition-colors">
                                    {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Pending invites */}
                    <div className="bg-dark-800 border border-white/5 rounded-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-white/5">
                            <h2 className="font-semibold text-white">Convites Pendentes ({team.invitations.length})</h2>
                        </div>
                        {team.invitations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-neutral-500">
                                <Mail className="w-8 h-8 mb-2 text-neutral-700" />
                                <p className="text-sm">Sem convites pendentes</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {team.invitations.map((invite) => (
                                    <div key={invite.id} className="flex items-center gap-4 px-6 py-4">
                                        <div className="w-9 h-9 bg-dark-700 rounded-xl flex items-center justify-center shrink-0">
                                            <Mail className="w-4 h-4 text-neutral-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-white truncate">{invite.email}</p>
                                            <p className="text-xs text-neutral-500">
                                                Enviado por {invite.invitedBy.name} • {format(parseISO(invite.createdAt), "d MMM", { locale: pt })}
                                            </p>
                                            <p className="text-xs text-neutral-600">
                                                Expira em {format(parseISO(invite.expiresAt), "d MMM yyyy", { locale: pt })}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => cancelInvite(invite.id)}
                                            disabled={actionLoading === invite.id}
                                            className="w-8 h-8 rounded-lg bg-dark-700 border border-white/8 text-neutral-500 hover:text-red-400 hover:border-red-500/20 flex items-center justify-center transition-all"
                                        >
                                            {actionLoading === invite.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Join Requests ── */}
            {activeTab === "requests" && (
                <div className="animate-fade-up bg-dark-800 border border-white/5 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-white/5">
                        <h2 className="font-semibold text-white">Pedidos para Entrar ({team.joinRequests.length})</h2>
                    </div>
                    {team.joinRequests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-neutral-500">
                            <UserPlus className="w-8 h-8 mb-2 text-neutral-700" />
                            <p className="text-sm">Sem pedidos pendentes</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {team.joinRequests.map((req) => (
                                <div key={req.id} className="flex items-center gap-4 px-6 py-4">
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                        style={{ background: "linear-gradient(135deg, rgba(43,143,191,0.2), rgba(232,23,122,0.2))" }}
                                    >
                                        <span className="text-white font-bold text-sm">{req.user.name.charAt(0).toUpperCase()}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-white">{req.user.name}</p>
                                        <p className="text-xs text-neutral-500">{req.user.email}</p>
                                        {req.message && <p className="text-xs text-neutral-400 mt-1 italic">"{req.message}"</p>}
                                        <p className="text-xs text-neutral-600 mt-0.5">
                                            {format(parseISO(req.createdAt), "d 'de' MMM yyyy", { locale: pt })}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <button
                                            onClick={() => respondJoinRequest(req.id, "accepted")}
                                            disabled={actionLoading === req.id}
                                            className="flex items-center gap-1.5 bg-brand-500/15 border border-brand-500/30 text-brand-300 hover:bg-brand-500/25 text-xs font-medium px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                                        >
                                            {actionLoading === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                            Aceitar
                                        </button>
                                        <button
                                            onClick={() => respondJoinRequest(req.id, "declined")}
                                            disabled={actionLoading === req.id}
                                            className="flex items-center gap-1.5 bg-dark-700 border border-white/8 text-neutral-400 hover:text-red-400 text-xs px-3 py-1.5 rounded-lg transition-all"
                                        >
                                            <X className="w-3 h-3" /> Recusar
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Competitions ── */}
            {activeTab === "competitions" && (
                <div className="animate-fade-up bg-dark-800 border border-white/5 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-white/5">
                        <h2 className="font-semibold text-white">Competições Pendentes ({team.competitions.length})</h2>
                    </div>
                    {team.competitions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-neutral-500">
                            <Trophy className="w-8 h-8 mb-2 text-neutral-700" />
                            <p className="text-sm">Sem competições pendentes</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {team.competitions.map((comp) => (
                                <div key={comp.id} className="flex items-center gap-4 px-6 py-4">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-white">{comp.title}</p>
                                        <p className="text-xs text-neutral-500">
                                            Criada por {comp.createdBy.name} • {metricLabel(comp.metric)}
                                        </p>
                                        <p className="text-xs text-neutral-600 mt-0.5">
                                            {format(parseISO(comp.startDate), "d MMM", { locale: pt })} → {format(parseISO(comp.endDate), "d MMM yyyy", { locale: pt })}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <button
                                            onClick={() => respondCompetition(comp.id, "approved")}
                                            disabled={actionLoading === comp.id}
                                            className="flex items-center gap-1.5 bg-green-500/15 border border-green-500/30 text-green-400 hover:bg-green-500/25 text-xs font-medium px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                                        >
                                            {actionLoading === comp.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                            Aprovar
                                        </button>
                                        <button
                                            onClick={() => respondCompetition(comp.id, "rejected")}
                                            disabled={actionLoading === comp.id}
                                            className="flex items-center gap-1.5 bg-dark-700 border border-white/8 text-neutral-400 hover:text-red-400 text-xs px-3 py-1.5 rounded-lg transition-all"
                                        >
                                            <X className="w-3 h-3" /> Rejeitar
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Tours ── */}
            {activeTab === "tours" && (
                <div className="animate-fade-up bg-dark-800 border border-white/5 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                        <h2 className="font-semibold text-white">Tours ({team.tours.length})</h2>
                        <button
                            onClick={() => router.push("/tour")}
                            className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                        >
                            Ver todos →
                        </button>
                    </div>
                    {team.tours.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-neutral-500">
                            <Flag className="w-8 h-8 mb-2 text-neutral-700" />
                            <p className="text-sm">Sem tours ainda</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {team.tours.map((tour) => (
                                <div
                                    key={tour.id}
                                    className="flex items-center gap-4 px-6 py-4 hover:bg-white/3 transition-colors cursor-pointer"
                                    onClick={() => router.push(`/tour/${tour.id}`)}
                                >
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                        style={{ background: "linear-gradient(135deg, rgba(43,143,191,0.2), rgba(232,23,122,0.2))" }}
                                    >
                                        <Flag className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-white truncate">{tour.name}</p>
                                        <p className="text-xs text-neutral-500">
                                            {format(parseISO(tour.startDate), "d MMM", { locale: pt })} → {format(parseISO(tour.endDate), "d MMM yyyy", { locale: pt })}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className="text-xs text-neutral-500">{tour._count.participants} participantes</span>
                                        <span className="text-xs text-neutral-500">{tour._count.stages} etapas</span>
                                        <span className={cn("text-xs px-2 py-0.5 rounded-full border", STATUS_COLORS[tour.status] ?? STATUS_COLORS.upcoming)}>
                                            {tour.status === "upcoming" ? "Em breve" : tour.status === "active" ? "A decorrer" : "Terminado"}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Stats ── */}
            {activeTab === "stats" && (
                <div className="animate-fade-up grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: "Membros", value: team._count.members, icon: Users, color: "#2B8FBF" },
                        { label: "Competições", value: team._count.competitions, icon: Trophy, color: "#E8177A" },
                        { label: "Tours", value: team._count.tours, icon: Flag, color: "#1fb8a0" },
                        { label: "Convites", value: team.invitations.length, icon: Mail, color: "#8B9FE8" },
                    ].map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className="bg-dark-800 border border-white/5 rounded-2xl p-5">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}18` }}>
                                <Icon className="w-4 h-4" style={{ color }} />
                            </div>
                            <p className="text-2xl font-bold text-white font-mono">{value}</p>
                            <p className="text-xs text-neutral-500 mt-0.5">{label}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}