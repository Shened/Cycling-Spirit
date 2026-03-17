"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
    Flag, Users, Calendar, ChevronLeft, Plus, X, Loader2,
    Clock, Trophy, Mountain, Zap, ChevronDown, Edit3,
    CheckCircle, AlertCircle, Star, Upload
} from "lucide-react";
import { parseGPX } from "@/lib/gpx";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import { cn, formatDuration } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TourUser { id: string; name: string; avatar?: string | null }

interface TourTeam { id: string; name: string; color: string }

interface SpecialResult { id: string; position: number; points: number; user: TourUser }

interface SpecialPoint {
    id: string; name: string; type: string; km?: number | null;
    results: SpecialResult[];
}

interface StageResult {
    id: string; userId: string; position?: number | null;
    timeSeconds?: number | null; bonusSeconds: number;
    points: number; dnf: boolean; user: TourUser;
}

interface Stage {
    id: string; number: number; name: string; date: string;
    distanceKm?: number | null; elevationM?: number | null;
    type: string; description?: string | null;
    polyline?: string | null;
    results: StageResult[];
    specialPoints: SpecialPoint[];
}

interface Participant {
    id: string; userId: string; status: string; tourTeamId?: string | null;
    user: TourUser; tourTeam?: TourTeam | null;
}

interface Tour {
    id: string; name: string; description?: string | null;
    type: string; status: string; startDate: string; endDate: string;
    organiserId: string;
    organiser: TourUser;
    team?: { id: string; name: string } | null;
    tourTeams: (TourTeam & { participants: { userId: string; user: TourUser }[] })[];
    participants: Participant[];
    stages: Stage[];
}

// ─── Classification helpers ───────────────────────────────────────────────────

function calcGC(participants: Participant[], stages: Stage[]) {
    return participants
        .filter((p) => p.status === "accepted")
        .map((p) => {
            let totalSeconds = 0;
            let bonusSeconds = 0;
            let dnf = false;
            for (const stage of stages) {
                const r = stage.results.find((r) => r.userId === p.userId);
                if (r?.dnf) { dnf = true; break; }
                totalSeconds += r?.timeSeconds ?? 0;
                bonusSeconds += r?.bonusSeconds ?? 0;
            }
            return { user: p.user, totalSeconds: totalSeconds - bonusSeconds, dnf };
        })
        .filter((p) => !p.dnf && p.totalSeconds > 0)
        .sort((a, b) => a.totalSeconds - b.totalSeconds);
}

function calcPoints(participants: Participant[], stages: Stage[]) {
    return participants
        .filter((p) => p.status === "accepted")
        .map((p) => {
            const points = stages.reduce((sum, s) => {
                const r = s.results.find((r) => r.userId === p.userId);
                return sum + (r?.points ?? 0);
            }, 0);
            return { user: p.user, points };
        })
        .sort((a, b) => b.points - a.points);
}

function calcSpecial(participants: Participant[], stages: Stage[], type: "sprint" | "mountain") {
    return participants
        .filter((p) => p.status === "accepted")
        .map((p) => {
            const points = stages.reduce((sum, s) => {
                return sum + s.specialPoints
                    .filter((sp) => sp.type === type)
                    .reduce((sp_sum, sp) => {
                        const r = sp.results.find((r) => r.user.id === p.userId);
                        return sp_sum + (r?.points ?? 0);
                    }, 0);
            }, 0);
            return { user: p.user, points };
        })
        .sort((a, b) => b.points - a.points);
}

// ─── Stage type labels ────────────────────────────────────────────────────────

const STAGE_TYPE: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    regular: { label: "Estrada", color: "text-neutral-400", icon: Flag },
    sprint: { label: "Sprint", color: "text-green-400", icon: Zap },
    mountain: { label: "Montanha", color: "text-purple-400", icon: Mountain },
    tt: { label: "CRI", color: "text-brand-400", icon: Clock },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    upcoming: { label: "Em breve", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
    active: { label: "A decorrer", color: "text-green-400 bg-green-400/10 border-green-400/20" },
    finished: { label: "Terminado", color: "text-neutral-500 bg-neutral-500/10 border-neutral-500/20" },
};

// ─── Points per position ──────────────────────────────────────────────────────
const STAGE_POINTS = [10, 8, 6, 5, 4, 3, 2, 1];
const SPRINT_POINTS = [5, 3, 2, 1];
const MOUNTAIN_POINTS = [5, 3, 2, 1];

// ─── Component ────────────────────────────────────────────────────────────────

export default function TourDetailClient({ tourId, currentUserId }: { tourId: string; currentUserId: string }) {
    const router = useRouter();
    const [tour, setTour] = useState<Tour | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"overview" | "stages" | "gc" | "points" | "sprint" | "mountain" | "teams">("overview");

    // Modals
    const [showAddStage, setShowAddStage] = useState(false);
    const [showAddResult, setShowAddResult] = useState<Stage | null>(null);
    const [showAddSpecial, setShowAddSpecial] = useState<Stage | null>(null);
    const [saving, setSaving] = useState(false);

    // Forms
    const [stageForm, setStageForm] = useState({
        number: "", name: "", date: "", distanceKm: "",
        elevationM: "", type: "regular", description: "", polyline: "",
    });

    const [stageGpxParsed, setStageGpxParsed] = useState(false);
    const [stageGpxFileName, setStageGpxFileName] = useState("");
    const stageFileRef = useRef<HTMLInputElement>(null);

    const [resultForm, setResultForm] = useState<{
        userId: string; timeMinutes: string; timeSeconds: string;
        bonusSeconds: string; dnf: boolean;
    }[]>([]);

    const [specialForm, setSpecialForm] = useState({
        name: "", type: "sprint", km: "",
        stravaSegmentId: "",
        results: [] as { userId: string; position: number; points: number }[],
    });

    const ActivityMap = dynamic(() => import("@/components/activity/ActivityMap"), { ssr: false });

    const fetchTour = useCallback(async () => {
        setLoading(true);
        const res = await fetch(`/api/tours/${tourId}`);
        if (res.ok) setTour(await res.json());
        setLoading(false);
    }, [tourId]);

    useEffect(() => { fetchTour(); }, [fetchTour]);

    const isOrganiser = tour?.organiserId === currentUserId;

    // Init result form when opening
    const openResultModal = (stage: Stage) => {
        const accepted = tour!.participants.filter((p) => p.status === "accepted");
        setResultForm(
            accepted.map((p) => {
                const existing = stage.results.find((r) => r.userId === p.userId);
                const mins = existing?.timeSeconds ? Math.floor(existing.timeSeconds / 60) : 0;
                const secs = existing?.timeSeconds ? existing.timeSeconds % 60 : 0;
                return {
                    userId: p.userId,
                    timeMinutes: mins ? String(mins) : "",
                    timeSeconds: secs ? String(secs) : "",
                    bonusSeconds: String(existing?.bonusSeconds ?? 0),
                    dnf: existing?.dnf ?? false,
                };
            })
        );
        setShowAddResult(stage);
    };

    const saveResults = async () => {
        if (!showAddResult) return;
        setSaving(true);
        const payload = resultForm
            .filter((r) => r.timeMinutes || r.dnf)
            .map((r, idx) => ({
                userId: r.userId,
                timeSeconds: r.dnf ? null : (parseInt(r.timeMinutes || "0") * 60 + parseInt(r.timeSeconds || "0")),
                bonusSeconds: parseInt(r.bonusSeconds || "0"),
                points: r.dnf ? 0 : (STAGE_POINTS[idx] ?? 0),
                dnf: r.dnf,
                position: r.dnf ? null : idx + 1,
            }));

        await fetch(`/api/tours/${tourId}/stages/${showAddResult.id}/results`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        setSaving(false);
        setShowAddResult(null);
        fetchTour();
    };

    const saveStage = async () => {
        if (!stageForm.name || !stageForm.date || !stageForm.number) return;
        setSaving(true);
        await fetch(`/api/tours/${tourId}/stages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                number: parseInt(stageForm.number),
                name: stageForm.name,
                date: new Date(stageForm.date).toISOString(),
                distanceKm: stageForm.distanceKm ? parseFloat(stageForm.distanceKm) : null,
                elevationM: stageForm.elevationM ? parseInt(stageForm.elevationM) : null,
                type: stageForm.type,
                description: stageForm.description || null,
                polyline: stageForm.polyline || null,
            }),
        });
        setSaving(false);
        setShowAddStage(false);
        setStageForm({ number: "", name: "", date: "", distanceKm: "", elevationM: "", type: "regular", description: "", polyline: "" });
        setStageGpxParsed(false);
        setStageGpxFileName("");
        fetchTour();
    };

    const saveSpecial = async () => {
        if (!showAddSpecial || !specialForm.name) return;
        setSaving(true);

        const res = await fetch(`/api/tours/${tourId}/stages/${showAddSpecial.id}/special`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: specialForm.name,
                type: specialForm.type,
                km: specialForm.km ? parseFloat(specialForm.km) : null,
                stravaSegmentId: specialForm.stravaSegmentId || null,
                stageDate: showAddSpecial.date,
                results: specialForm.stravaSegmentId ? [] : specialForm.results,
            }),
        });

        if (!res.ok) {
            const data = await res.json();
            alert(data.error ?? "Erro ao guardar meta volante.");
        } else {
            setShowAddSpecial(null);
            setSpecialForm({ name: "", type: "sprint", km: "", stravaSegmentId: "", results: [] });
            fetchTour();
        }
        setSaving(false);
    };

    const respondInvite = async (status: "accepted" | "declined") => {
        await fetch(`/api/tours/${tourId}/participants`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        });
        fetchTour();
    };

    if (loading) return (
        <div className="flex items-center justify-center py-32">
            <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
        </div>
    );

    if (!tour) return (
        <div className="text-center py-32 text-neutral-500">Tour não encontrado.</div>
    );

    const myParticipation = tour.participants.find((p) => p.userId === currentUserId);
    const gc = calcGC(tour.participants, tour.stages);
    const points = calcPoints(tour.participants, tour.stages);
    const sprint = calcSpecial(tour.participants, tour.stages, "sprint");
    const mountain = calcSpecial(tour.participants, tour.stages, "mountain");
    const status = STATUS_LABELS[tour.status] ?? STATUS_LABELS.upcoming;
    const leader = gc[0]?.user;

    const TABS = [
        { key: "overview", label: "Visão Geral" },
        { key: "stages", label: "Etapas" },
        { key: "gc", label: "🟡 Geral" },
        { key: "points", label: "🟢 Pontos" },
        { key: "sprint", label: "⚡ Sprint" },
        { key: "mountain", label: "🔴 Montanha" },
        ...(tour.tourTeams.length > 0 ? [{ key: "teams", label: "⬜ Equipas" }] : []),
    ];

    const handleStageGPX = async (file: File) => {
        try {
            const text = await file.text();
            const data = parseGPX(text);
            const polylineModule = await import("@mapbox/polyline");
            const encoded = polylineModule.default.encode(
                data.points.map((p) => [p.lat, p.lon])
            );
            setStageForm((f) => ({
                ...f,
                polyline: encoded,
                distanceKm: f.distanceKm || String(data.distanceKm),
                elevationM: f.elevationM || String(data.elevationM),
            }));
            setStageGpxParsed(true);
            setStageGpxFileName(file.name);
        } catch {
            alert("Erro ao ler o ficheiro GPX.");
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Back */}
            <button onClick={() => router.back()} className="flex items-center gap-2 text-neutral-500 hover:text-white text-sm transition-colors animate-fade-up">
                <ChevronLeft className="w-4 h-4" /> Voltar
            </button>

            <div className="animate-fade-up delay-100 bg-dark-800 border border-white/5 rounded-2xl p-5">
                <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ background: "linear-gradient(135deg, rgba(43,143,191,0.3), rgba(232,23,122,0.3))" }}>
                        <Flag className="w-6 h-6 text-white" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="font-display text-xl text-white tracking-wide truncate">{tour.name.toUpperCase()}</h1>
                                    <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium shrink-0", status.color)}>
                                        {status.label}
                                    </span>
                                </div>
                                {tour.description && (
                                    <p className="text-sm text-neutral-400 mt-1 line-clamp-2">{tour.description}</p>
                                )}
                            </div>
                            {/* Leader badge */}
                            {leader && (
                                <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-2 py-1.5 shrink-0">
                                    <span className="text-base">🟡</span>
                                    <div className="hidden sm:block">
                                        <p className="text-xs text-yellow-400 font-medium">Líder</p>
                                        <p className="text-xs text-white font-semibold">{leader.name}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-3 mt-2 text-xs text-neutral-500 flex-wrap">
                            <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 shrink-0" />
                                {format(parseISO(tour.startDate), "d MMM", { locale: pt })} → {format(parseISO(tour.endDate), "d MMM yyyy", { locale: pt })}
                            </span>
                            <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5 shrink-0" />
                                {tour.participants.filter((p) => p.status === "accepted").length} participantes
                            </span>
                            <span className="flex items-center gap-1">
                                <Flag className="w-3.5 h-3.5 shrink-0" />
                                {tour.stages.length} etapas
                            </span>
                        </div>
                    </div>
                </div>

                {/* Pending invite */}
                {myParticipation?.status === "pending" && (
                    <div className="mt-4 p-3 bg-brand-500/10 border border-brand-500/20 rounded-xl flex items-center justify-between gap-4 flex-wrap">
                        <p className="text-sm text-brand-300">Foste convidado para este tour!</p>
                        <div className="flex gap-2">
                            <button onClick={() => respondInvite("accepted")} className="flex items-center gap-1.5 bg-brand-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:bg-brand-400">
                                <CheckCircle className="w-3.5 h-3.5" /> Aceitar
                            </button>
                            <button onClick={() => respondInvite("declined")} className="flex items-center gap-1.5 bg-dark-700 border border-white/10 text-neutral-400 text-xs px-3 py-1.5 rounded-lg transition-all hover:text-white">
                                <AlertCircle className="w-3.5 h-3.5" /> Recusar
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-dark-800 border border-white/5 rounded-xl p-1 overflow-x-auto animate-fade-up delay-200">
                {TABS.map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => setActiveTab(key as typeof activeTab)}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                            activeTab === key ? "bg-brand-500/20 text-white border border-brand-500/30" : "text-neutral-500 hover:text-neutral-200"
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* ── Overview ── */}
            {activeTab === "overview" && (
                <div className="space-y-4 animate-fade-up">
                    {/* Participants */}
                    <div className="bg-dark-800 border border-white/5 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold text-white">Participantes</h2>
                            {isOrganiser && (
                                <button className="text-xs text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1">
                                    <Plus className="w-3.5 h-3.5" /> Convidar
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {tour.participants.map((p) => (
                                <div key={p.id} className="flex items-center gap-3 p-2.5 bg-dark-700 rounded-xl border border-white/5">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                        style={{ background: p.tourTeam ? `${p.tourTeam.color}30` : "rgba(43,143,191,0.2)" }}>
                                        <span className="text-xs font-bold text-white">{p.user.name.charAt(0).toUpperCase()}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">{p.user.name}</p>
                                        {p.tourTeam && <p className="text-xs text-neutral-500">{p.tourTeam.name}</p>}
                                    </div>
                                    <span className={cn("text-xs px-2 py-0.5 rounded-full border",
                                        p.status === "accepted" ? "text-green-400 bg-green-400/10 border-green-400/20" :
                                            p.status === "pending" ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" :
                                                "text-neutral-500 bg-neutral-500/10 border-neutral-500/20"
                                    )}>
                                        {p.status === "accepted" ? "Confirmado" : p.status === "pending" ? "Pendente" : "Recusado"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* GC preview */}
                    {gc.length > 0 && (
                        <div className="bg-dark-800 border border-white/5 rounded-2xl p-6">
                            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
                                🟡 Classificação Geral
                            </h2>
                            <div className="space-y-2">
                                {gc.slice(0, 5).map((entry, idx) => (
                                    <div key={entry.user.id} className={cn("flex items-center gap-3 p-2.5 rounded-xl", idx === 0 ? "bg-yellow-500/8 border border-yellow-500/15" : "bg-dark-700")}>
                                        <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                                            idx === 0 ? "bg-yellow-500/20 text-yellow-400" :
                                                idx === 1 ? "bg-neutral-400/20 text-neutral-300" :
                                                    idx === 2 ? "bg-amber-700/20 text-amber-600" :
                                                        "bg-dark-600 text-neutral-500"
                                        )}>
                                            {idx === 0 ? <Star className="w-3 h-3" /> : idx + 1}
                                        </div>
                                        <span className="text-sm text-white flex-1">{entry.user.name}</span>
                                        <span className="text-sm font-mono font-bold text-brand-400">{formatDuration(entry.totalSeconds)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Stages ── */}
            {activeTab === "stages" && (
                <div className="space-y-4 animate-fade-up">
                    {isOrganiser && (
                        <button
                            onClick={() => setShowAddStage(true)}
                            className="w-full flex items-center justify-center gap-2 bg-dark-800 border border-dashed border-white/15 hover:border-brand-500/40 hover:bg-brand-500/5 text-neutral-400 hover:text-brand-300 text-sm py-3 rounded-2xl transition-all"
                        >
                            <Plus className="w-4 h-4" /> Adicionar Etapa
                        </button>
                    )}

                    {tour.stages.length === 0 ? (
                        <div className="text-center py-16 text-neutral-500">Sem etapas ainda.</div>
                    ) : (
                        tour.stages.map((stage) => {
                            const stageType = STAGE_TYPE[stage.type] ?? STAGE_TYPE.regular;
                            const StageIcon = stageType.icon;
                            return (
                                <div key={stage.id} className="bg-dark-800 border border-white/5 rounded-2xl overflow-hidden">
                                    {/* Stage header */}
                                    <div className="px-5 py-4 border-b border-white/5">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                                <div className="w-8 h-8 bg-dark-700 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                                                    <StageIcon className={cn("w-4 h-4", stageType.color)} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-white">{stage.name}</p>
                                                    <p className="text-xs text-neutral-400 mt-0.5">Etapa {stage.number}</p>
                                                    <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1 flex-wrap">
                                                        <span>{format(parseISO(stage.date), "d MMM yyyy", { locale: pt })}</span>
                                                        {stage.distanceKm && <span>{stage.distanceKm} km</span>}
                                                        {stage.elevationM && <span>{stage.elevationM}m ↑</span>}
                                                        <span className={stageType.color}>{stageType.label}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {isOrganiser && (
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <button
                                                        onClick={() => { setShowAddSpecial(stage); setSpecialForm({ name: "", type: "sprint", km: "", results: [], stravaSegmentId: "" }); }}
                                                        className="text-xs bg-dark-700 border border-white/8 text-neutral-400 hover:text-white px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1"
                                                    >
                                                        <Zap className="w-3 h-3" /> <span className="hidden sm:inline">Meta</span>
                                                    </button>
                                                    <button
                                                        onClick={() => openResultModal(stage)}
                                                        className="text-xs bg-brand-500/15 border border-brand-500/30 text-brand-300 hover:bg-brand-500/25 px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1"
                                                    >
                                                        <Edit3 className="w-3 h-3" /> <span className="hidden sm:inline">Resultados</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Map */}
                                    {stage.polyline && (
                                        <div className="h-48 w-full">
                                            <ActivityMap polyline={stage.polyline} />
                                        </div>
                                    )}

                                    {/* Results */}
                                    {stage.results.length > 0 && (
                                        <div className="px-5 py-3 space-y-1.5">
                                            {stage.results
                                                .slice()
                                                .sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
                                                .map((r, idx) => (
                                                    <div key={r.id} className="flex items-center gap-3">
                                                        <span className={cn("w-5 text-center text-xs font-bold shrink-0",
                                                            idx === 0 ? "text-yellow-400" :
                                                                idx === 1 ? "text-neutral-300" :
                                                                    idx === 2 ? "text-amber-600" : "text-neutral-500"
                                                        )}>
                                                            {r.dnf ? "DNF" : idx + 1}
                                                        </span>
                                                        <span className="text-sm text-white flex-1 truncate">{r.user.name}</span>
                                                        <span className="text-sm font-mono text-brand-400">
                                                            {r.dnf ? "—" : r.timeSeconds ? formatDuration(r.timeSeconds) : "—"}
                                                        </span>
                                                        {r.bonusSeconds > 0 && (
                                                            <span className="text-xs text-green-400">-{r.bonusSeconds}s</span>
                                                        )}
                                                    </div>
                                                ))}
                                        </div>
                                    )}

                                    {/* Special points */}
                                    {stage.specialPoints.length > 0 && (
                                        <div className="px-5 pb-4 pt-2 border-t border-white/5 space-y-2">
                                            {stage.specialPoints.map((sp) => (
                                                <div key={sp.id}>
                                                    <p className="text-xs font-medium text-neutral-400 mb-1 flex items-center gap-1">
                                                        {sp.type === "sprint" ? "⚡" : "🔴"} {sp.name}
                                                        {sp.km && <span className="text-neutral-600">• km {sp.km}</span>}
                                                    </p>
                                                    <div className="flex gap-3 flex-wrap">
                                                        {sp.results.slice(0, 3).map((r) => (
                                                            <span key={r.id} className="text-xs text-neutral-300">
                                                                {r.position}. {r.user.name} <span className="text-brand-400">({r.points}pts)</span>
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* ── GC ── */}
            {activeTab === "gc" && (
                <div className="animate-fade-up bg-dark-800 border border-white/5 rounded-2xl p-6">
                    <h2 className="font-semibold text-white mb-5 flex items-center gap-2">🟡 Classificação Geral</h2>
                    {gc.length === 0 ? (
                        <p className="text-neutral-500 text-sm text-center py-8">Sem resultados ainda.</p>
                    ) : (
                        <div className="space-y-2">
                            {gc.map((entry, idx) => (
                                <div key={entry.user.id} className={cn("flex items-center gap-3 p-3 rounded-xl",
                                    idx === 0 ? "bg-yellow-500/8 border border-yellow-500/15" : "bg-dark-700"
                                )}>
                                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                                        idx === 0 ? "bg-yellow-500/20 text-yellow-400" :
                                            idx === 1 ? "bg-neutral-400/20 text-neutral-300" :
                                                idx === 2 ? "bg-amber-700/20 text-amber-600" :
                                                    "bg-dark-600 text-neutral-500"
                                    )}>
                                        {idx === 0 ? "🟡" : idx + 1}
                                    </div>
                                    <span className="text-sm text-white flex-1 font-medium">{entry.user.name}</span>
                                    <span className="text-sm font-mono font-bold text-white">{formatDuration(entry.totalSeconds)}</span>
                                    {idx > 0 && gc[0] && (
                                        <span className="text-xs text-neutral-500 font-mono">+{formatDuration(entry.totalSeconds - gc[0].totalSeconds)}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Points ── */}
            {activeTab === "points" && (
                <div className="animate-fade-up bg-dark-800 border border-white/5 rounded-2xl p-6">
                    <h2 className="font-semibold text-white mb-5">🟢 Classificação por Pontos</h2>
                    {points.filter((p) => p.points > 0).length === 0 ? (
                        <p className="text-neutral-500 text-sm text-center py-8">Sem pontos ainda.</p>
                    ) : (
                        <div className="space-y-2">
                            {points.filter((p) => p.points > 0).map((entry, idx) => (
                                <div key={entry.user.id} className={cn("flex items-center gap-3 p-3 rounded-xl",
                                    idx === 0 ? "bg-green-500/8 border border-green-500/15" : "bg-dark-700"
                                )}>
                                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                                        idx === 0 ? "bg-green-500/20 text-green-400" : "bg-dark-600 text-neutral-500"
                                    )}>
                                        {idx === 0 ? "🟢" : idx + 1}
                                    </div>
                                    <span className="text-sm text-white flex-1 font-medium">{entry.user.name}</span>
                                    <span className="text-sm font-mono font-bold text-green-400">{entry.points} pts</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Sprint ── */}
            {activeTab === "sprint" && (
                <div className="animate-fade-up bg-dark-800 border border-white/5 rounded-2xl p-6">
                    <h2 className="font-semibold text-white mb-5">⚡ Camisola Verde — Metas de Sprint</h2>
                    {sprint.filter((p) => p.points > 0).length === 0 ? (
                        <p className="text-neutral-500 text-sm text-center py-8">Sem metas de sprint ainda.</p>
                    ) : (
                        <div className="space-y-2">
                            {sprint.filter((p) => p.points > 0).map((entry, idx) => (
                                <div key={entry.user.id} className={cn("flex items-center gap-3 p-3 rounded-xl",
                                    idx === 0 ? "bg-green-500/8 border border-green-500/15" : "bg-dark-700"
                                )}>
                                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                                        idx === 0 ? "bg-green-500/20 text-green-400" : "bg-dark-600 text-neutral-500"
                                    )}>
                                        {idx === 0 ? "⚡" : idx + 1}
                                    </div>
                                    <span className="text-sm text-white flex-1 font-medium">{entry.user.name}</span>
                                    <span className="text-sm font-mono font-bold text-green-400">{entry.points} pts</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Mountain ── */}
            {activeTab === "mountain" && (
                <div className="animate-fade-up bg-dark-800 border border-white/5 rounded-2xl p-6">
                    <h2 className="font-semibold text-white mb-5">🔴 Camisola da Montanha</h2>
                    {mountain.filter((p) => p.points > 0).length === 0 ? (
                        <p className="text-neutral-500 text-sm text-center py-8">Sem metas de montanha ainda.</p>
                    ) : (
                        <div className="space-y-2">
                            {mountain.filter((p) => p.points > 0).map((entry, idx) => (
                                <div key={entry.user.id} className={cn("flex items-center gap-3 p-3 rounded-xl",
                                    idx === 0 ? "bg-red-500/8 border border-red-500/15" : "bg-dark-700"
                                )}>
                                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                                        idx === 0 ? "bg-red-500/20 text-red-400" : "bg-dark-600 text-neutral-500"
                                    )}>
                                        {idx === 0 ? "🔴" : idx + 1}
                                    </div>
                                    <span className="text-sm text-white flex-1 font-medium">{entry.user.name}</span>
                                    <span className="text-sm font-mono font-bold text-red-400">{entry.points} pts</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Tour Teams ── */}
            {activeTab === "teams" && tour.tourTeams.length > 0 && (
                <div className="animate-fade-up space-y-4">
                    {tour.tourTeams.map((team) => {
                        // Classificação da equipa — soma dos tempos dos membros no GC
                        const teamGC = gc.filter((g) =>
                            team.participants.some((p) => p.userId === g.user.id)
                        );
                        const teamTime = teamGC.reduce((s, g) => s + g.totalSeconds, 0);
                        return (
                            <div key={team.id} className="bg-dark-800 border border-white/5 rounded-2xl p-5">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-4 h-4 rounded-full shrink-0" style={{ background: team.color }} />
                                    <h3 className="font-bold text-white">{team.name}</h3>
                                    {teamTime > 0 && (
                                        <span className="ml-auto text-sm font-mono text-brand-400">{formatDuration(teamTime)}</span>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    {team.participants.map((p) => (
                                        <div key={p.userId} className="flex items-center gap-2 text-sm">
                                            <div className="w-6 h-6 rounded-lg bg-dark-700 flex items-center justify-center shrink-0">
                                                <span className="text-xs text-neutral-400">{p.user.name.charAt(0)}</span>
                                            </div>
                                            <span className="text-neutral-300">{p.user.name}</span>
                                            <span className="ml-auto text-xs font-mono text-neutral-500">
                                                {gc.find((g) => g.user.id === p.userId) ? formatDuration(gc.find((g) => g.user.id === p.userId)!.totalSeconds) : "—"}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Modal: Add Stage ── */}
            {showAddStage && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-dark-800 border border-white/10 rounded-2xl p-6 w-full max-w-md animate-fade-up">

                        {/* GPX Upload */}
                        <div
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                e.preventDefault();
                                const file = e.dataTransfer.files[0];
                                if (file?.name.endsWith(".gpx")) handleStageGPX(file);
                            }}
                            onClick={() => !stageGpxParsed && stageFileRef.current?.click()}
                            className={cn(
                                "mb-5 rounded-xl border-2 border-dashed p-4 text-center transition-all",
                                stageGpxParsed
                                    ? "border-brand-500/40 bg-brand-500/8 cursor-default"
                                    : "border-white/10 bg-dark-700 hover:border-brand-500/40 hover:bg-brand-500/5 cursor-pointer"
                            )}
                        >
                            {stageGpxParsed ? (
                                <div className="flex items-center justify-center gap-3">
                                    <CheckCircle className="w-5 h-5 text-brand-400 shrink-0" />
                                    <div className="text-left">
                                        <p className="text-sm font-medium text-white">{stageGpxFileName}</p>
                                        <p className="text-xs text-brand-400">GPX importado — mapa disponível na etapa</p>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setStageGpxParsed(false);
                                            setStageGpxFileName("");
                                            setStageForm((f) => ({ ...f, polyline: "" }));
                                        }}
                                        className="ml-auto text-neutral-500 hover:text-white"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2 py-1">
                                    <Upload className="w-5 h-5 text-neutral-400" />
                                    <p className="text-sm text-neutral-400">
                                        <span className="text-brand-400 font-medium">Clica</span> ou arrasta um{" "}
                                        <span className="font-mono text-xs bg-dark-600 px-1.5 py-0.5 rounded">.gpx</span>
                                    </p>
                                    <p className="text-xs text-neutral-600">Preenche distância, subida e mapa automaticamente</p>
                                </div>
                            )}
                            <input
                                ref={stageFileRef}
                                type="file"
                                accept=".gpx"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleStageGPX(file);
                                }}
                            />
                        </div>

                        <div className="flex items-center justify-between mb-5">
                            <h3 className="font-semibold text-white text-lg">Adicionar Etapa</h3>
                            <button onClick={() => setShowAddStage(false)} className="text-neutral-500 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">Nº Etapa *</label>
                                    <input type="number" value={stageForm.number} onChange={(e) => setStageForm({ ...stageForm, number: e.target.value })} placeholder="1" className="w-full bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500" />
                                </div>
                                <div>
                                    <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">Data *</label>
                                    <input type="date" value={stageForm.date} onChange={(e) => setStageForm({ ...stageForm, date: e.target.value })} className="w-full bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 [color-scheme:dark]" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">Nome *</label>
                                <input value={stageForm.name} onChange={(e) => setStageForm({ ...stageForm, name: e.target.value })} placeholder="Ex: Freixo → Serra do Pilar" className="w-full bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-brand-500" />
                            </div>
                            <div>
                                <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">Tipo</label>
                                <div className="grid grid-cols-4 gap-1.5">
                                    {Object.entries(STAGE_TYPE).map(([key, val]) => {
                                        const Icon = val.icon;
                                        return (
                                            <button key={key} onClick={() => setStageForm({ ...stageForm, type: key })}
                                                className={cn("flex flex-col items-center gap-1 py-2 rounded-xl border text-xs transition-all",
                                                    stageForm.type === key ? "border-brand-500/50 bg-brand-500/10" : "border-white/8 bg-dark-700 hover:border-white/15"
                                                )}>
                                                <Icon className={cn("w-4 h-4", stageForm.type === key ? val.color : "text-neutral-500")} />
                                                <span className={stageForm.type === key ? "text-white" : "text-neutral-500"}>{val.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">Distância (km)</label>
                                    <input type="number" step="0.1" value={stageForm.distanceKm} onChange={(e) => setStageForm({ ...stageForm, distanceKm: e.target.value })} placeholder="0" className="w-full bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500" />
                                </div>
                                <div>
                                    <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">Subida (m)</label>
                                    <input type="number" value={stageForm.elevationM} onChange={(e) => setStageForm({ ...stageForm, elevationM: e.target.value })} placeholder="0" className="w-full bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500" />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowAddStage(false)} className="flex-1 py-2.5 rounded-xl bg-dark-700 border border-white/8 text-neutral-400 hover:text-white text-sm transition-all">Cancelar</button>
                            <button onClick={saveStage} disabled={saving || !stageForm.name || !stageForm.date || !stageForm.number} className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal: Add Results ── */}
            {showAddResult && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-dark-800 border border-white/10 rounded-2xl p-6 w-full max-w-lg animate-fade-up max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="font-semibold text-white text-lg">Resultados — Etapa {showAddResult.number}</h3>
                            <button onClick={() => setShowAddResult(null)} className="text-neutral-500 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <p className="text-xs text-neutral-500 mb-4">Introduz os tempos por ordem de chegada (1º lugar primeiro).</p>
                        <div className="space-y-3">
                            {resultForm.map((r, idx) => {
                                const participant = tour.participants.find((p) => p.userId === r.userId);
                                return (
                                    <div key={r.userId} className="flex items-center gap-3 p-3 bg-dark-700 rounded-xl border border-white/5">
                                        <span className="text-xs font-bold text-neutral-500 w-4 shrink-0">{idx + 1}.</span>
                                        <span className="text-sm text-white flex-1 min-w-0 truncate">{participant?.user.name}</span>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <input
                                                type="number"
                                                value={r.timeMinutes}
                                                onChange={(e) => {
                                                    const updated = [...resultForm];
                                                    updated[idx] = { ...updated[idx], timeMinutes: e.target.value };
                                                    setResultForm(updated);
                                                }}
                                                placeholder="min"
                                                disabled={r.dnf}
                                                className="w-14 bg-dark-600 border border-white/8 rounded-lg px-2 py-1.5 text-xs text-white text-center focus:outline-none focus:border-brand-500 disabled:opacity-30"
                                            />
                                            <span className="text-neutral-500 text-xs">:</span>
                                            <input
                                                type="number"
                                                value={r.timeSeconds}
                                                onChange={(e) => {
                                                    const updated = [...resultForm];
                                                    updated[idx] = { ...updated[idx], timeSeconds: e.target.value };
                                                    setResultForm(updated);
                                                }}
                                                placeholder="seg"
                                                disabled={r.dnf}
                                                className="w-14 bg-dark-600 border border-white/8 rounded-lg px-2 py-1.5 text-xs text-white text-center focus:outline-none focus:border-brand-500 disabled:opacity-30"
                                            />
                                            <input
                                                type="number"
                                                value={r.bonusSeconds}
                                                onChange={(e) => {
                                                    const updated = [...resultForm];
                                                    updated[idx] = { ...updated[idx], bonusSeconds: e.target.value };
                                                    setResultForm(updated);
                                                }}
                                                placeholder="-s"
                                                disabled={r.dnf}
                                                title="Segundos de bónus"
                                                className="w-12 bg-green-500/10 border border-green-500/20 rounded-lg px-2 py-1.5 text-xs text-green-400 text-center focus:outline-none focus:border-green-400 disabled:opacity-30"
                                            />
                                            <button
                                                onClick={() => {
                                                    const updated = [...resultForm];
                                                    updated[idx] = { ...updated[idx], dnf: !updated[idx].dnf };
                                                    setResultForm(updated);
                                                }}
                                                className={cn("text-xs px-2 py-1.5 rounded-lg border transition-all",
                                                    r.dnf ? "bg-red-500/20 border-red-500/30 text-red-400" : "bg-dark-600 border-white/8 text-neutral-500 hover:text-white"
                                                )}
                                            >
                                                DNF
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowAddResult(null)} className="flex-1 py-2.5 rounded-xl bg-dark-700 border border-white/8 text-neutral-400 hover:text-white text-sm transition-all">Cancelar</button>
                            <button onClick={saveResults} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal: Add Special Point ── */}
            {showAddSpecial && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-dark-800 border border-white/10 rounded-2xl p-6 w-full max-w-md animate-fade-up max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="font-semibold text-white text-lg">Meta Volante — Etapa {showAddSpecial.number}</h3>
                            <button onClick={() => setShowAddSpecial(null)} className="text-neutral-500 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">Nome *</label>
                                    <input
                                        value={specialForm.name}
                                        onChange={(e) => setSpecialForm({ ...specialForm, name: e.target.value })}
                                        placeholder="Ex: Sprint Freixo"
                                        className="w-full bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-brand-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">Km</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={specialForm.km}
                                        onChange={(e) => setSpecialForm({ ...specialForm, km: e.target.value })}
                                        placeholder="0"
                                        className="w-full bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                                    />
                                </div>


                            </div>
                            {/* Strava Segment */}
                            <div>
                                <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1 block">Strava Segment ID</label>
                                <p className="text-xs text-neutral-600 mb-1.5">Opcional — deteta vencedores automaticamente via Strava</p>
                                <input
                                    value={specialForm.stravaSegmentId}
                                    onChange={(e) => setSpecialForm({ ...specialForm, stravaSegmentId: e.target.value })}
                                    placeholder="Ex: 1234567"
                                    className="w-full bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-brand-500"
                                />
                                {specialForm.stravaSegmentId && (
                                    <p className="text-xs text-brand-400 mt-1.5 flex items-center gap-1">
                                        ⚡ Os vencedores serão detetados automaticamente via Strava
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">Tipo</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[{ value: "sprint", label: "⚡ Sprint" }, { value: "mountain", label: "🔴 Montanha" }].map((t) => (
                                        <button key={t.value} onClick={() => setSpecialForm({ ...specialForm, type: t.value })}
                                            className={cn("py-2 rounded-xl border text-sm transition-all",
                                                specialForm.type === t.value ? "border-brand-500/40 bg-brand-500/10 text-white" : "border-white/8 bg-dark-700 text-neutral-400 hover:border-white/15"
                                            )}>
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Resultados da meta */}
                            {!specialForm.stravaSegmentId && (
                                <div>
                                    <label className="text-xs text-neutral-400 uppercase tracking-wider mb-2 block">Resultados</label>
                                    <div className="space-y-2">
                                        {tour.participants.filter((p) => p.status === "accepted").slice(0, 4).map((p, idx) => {
                                            const points = specialForm.type === "sprint" ? (SPRINT_POINTS[idx] ?? 0) : (MOUNTAIN_POINTS[idx] ?? 0);
                                            const existing = specialForm.results.find((r) => r.userId === p.userId);
                                            return (
                                                <div key={p.userId} className="flex items-center gap-3">
                                                    <span className="text-xs text-neutral-500 w-4">{idx + 1}.</span>
                                                    <div className="relative flex-1">
                                                        <select
                                                            value={existing?.userId ?? ""}
                                                            onChange={(e) => {
                                                                const newResults = specialForm.results.filter((r) => r.position !== idx + 1);
                                                                if (e.target.value) {
                                                                    newResults.push({ userId: e.target.value, position: idx + 1, points });
                                                                }
                                                                setSpecialForm({ ...specialForm, results: newResults });
                                                            }}
                                                            className="w-full appearance-none bg-dark-700 border border-white/8 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 cursor-pointer"
                                                        >
                                                            <option value="">— Selecionar —</option>
                                                            {tour.participants.filter((pp) => pp.status === "accepted").map((pp) => (
                                                                <option key={pp.userId} value={pp.userId}>{pp.user.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <span className="text-xs text-brand-400 font-mono w-12 text-right">{points} pts</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowAddSpecial(null)} className="flex-1 py-2.5 rounded-xl bg-dark-700 border border-white/8 text-neutral-400 hover:text-white text-sm transition-all">Cancelar</button>
                            <button onClick={saveSpecial} disabled={saving || !specialForm.name} className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}