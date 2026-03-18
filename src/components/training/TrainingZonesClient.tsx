// src/components/training/TrainingZonesClient.tsx
// Substitui o ficheiro existente

"use client";
import { useState } from "react";
import {
    Zap, Heart, Settings, Info, ChevronRight,
    AlertCircle, Save, Loader2, Check, Plus, Trash2
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ─── Zonas de Potência (Coggan 7 zonas) ──────────────────────────────────────
const POWER_ZONES = [
    { zone: 1, name: "Recuperação Ativa", label: "Z1", minPct: 0, maxPct: 55, color: "#6b7280", bgColor: "rgba(107,114,128,0.12)", borderColor: "rgba(107,114,128,0.3)", description: "Pedalada muito suave. Recuperação entre esforços ou no dia seguinte a treinos intensos.", feel: "Conversação fácil, nem sequer ficas com falta de ar", rpe: "1–2 / 10" },
    { zone: 2, name: "Resistência", label: "Z2", minPct: 56, maxPct: 75, color: "#3b82f6", bgColor: "rgba(59,130,246,0.12)", borderColor: "rgba(59,130,246,0.3)", description: "Base aeróbica. A maior parte do volume de treino deve estar aqui.", feel: "Consegues falar frases completas sem dificuldade", rpe: "3–4 / 10" },
    { zone: 3, name: "Tempo", label: "Z3", minPct: 76, maxPct: 90, color: "#22c55e", bgColor: "rgba(34,197,94,0.12)", borderColor: "rgba(34,197,94,0.3)", description: "Esforço moderado sustentável. Melhora a eficiência aeróbica e o limiar de lactato.", feel: "Consegues falar mas preferes não o fazer", rpe: "5–6 / 10" },
    { zone: 4, name: "Limiar de Lactato", label: "Z4", minPct: 91, maxPct: 105, color: "#f59e0b", bgColor: "rgba(245,158,11,0.12)", borderColor: "rgba(245,158,11,0.3)", description: "Zona do FTP. Esforço intenso mas controlado.", feel: "Discurso muito difícil — palavras soltas apenas", rpe: "7–8 / 10" },
    { zone: 5, name: "VO2 Máx", label: "Z5", minPct: 106, maxPct: 120, color: "#f97316", bgColor: "rgba(249,115,22,0.12)", borderColor: "rgba(249,115,22,0.3)", description: "Intervalos de 3–8 minutos. Desenvolve o VO2max.", feel: "Impossível falar. Respiração muito intensa", rpe: "9 / 10" },
    { zone: 6, name: "Capacidade Anaeróbica", label: "Z6", minPct: 121, maxPct: 150, color: "#ef4444", bgColor: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.3)", description: "Sprints de 30s a 2 minutos. Desenvolve a potência máxima.", feel: "Máximo esforço possível por curtos períodos", rpe: "10 / 10" },
    { zone: 7, name: "Potência Neuromuscular", label: "Z7", minPct: 151, maxPct: null, color: "#E8177A", bgColor: "rgba(232,23,122,0.12)", borderColor: "rgba(232,23,122,0.3)", description: "Sprints máximos de menos de 30 segundos.", feel: "100% — explosivo e instantâneo", rpe: "10+ / 10" },
];

// ─── Cores disponíveis para novas zonas ──────────────────────────────────────
const ZONE_COLORS = [
    "#6b7280", "#3b82f6", "#22c55e", "#f59e0b",
    "#ef4444", "#f97316", "#E8177A", "#a855f7",
    "#06b6d4", "#84cc16",
];

// ─── Zonas de FC por defeito ──────────────────────────────────────────────────
const DEFAULT_HR_ZONES: HRZone[] = [
    { zone: 1, name: "Recuperação", min: 100, max: 120, color: "#6b7280" },
    { zone: 2, name: "Base Aeróbica", min: 120, max: 140, color: "#3b82f6" },
    { zone: 3, name: "Aeróbico", min: 140, max: 160, color: "#22c55e" },
    { zone: 4, name: "Limiar Anaeróbico", min: 160, max: 175, color: "#f59e0b" },
    { zone: 5, name: "Máximo", min: 175, max: 195, color: "#ef4444" },
];

interface HRZone {
    zone: number;
    name: string;
    min: number;
    max: number;
    color: string;
}

interface Props {
    user: {
        id: string;
        name: string;
        ftpWatts?: number | null;
        weightKg?: number | null;
        hrZones?: unknown;
    };
    estimatedMaxHR: number | null;
}

export default function TrainingZonesClient({ user, estimatedMaxHR }: Props) {
    const [ftp, setFtp] = useState(user.ftpWatts ?? 0);
    const [activeTab, setActiveTab] = useState<"power" | "hr">("power");
    const [expandedZone, setExpandedZone] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [editingHR, setEditingHR] = useState(false);

    // Carrega zonas guardadas ou usa defaults
    const savedHRZones = user.hrZones as HRZone[] | null;
    const [hrZones, setHrZones] = useState<HRZone[]>(
        savedHRZones && savedHRZones.length > 0 ? savedHRZones : DEFAULT_HR_ZONES
    );
    const [hrDraft, setHrDraft] = useState<HRZone[]>(hrZones);

    const hasFTP = ftp > 0;
    const wattsPerKg = hasFTP && user.weightKg ? (ftp / user.weightKg).toFixed(2) : null;

    const getPowerRange = (minPct: number, maxPct: number | null) => {
        if (!hasFTP) return "— w";
        const min = Math.round(ftp * minPct / 100);
        const max = maxPct ? Math.round(ftp * maxPct / 100) : null;
        return max ? `${min} – ${max} w` : `> ${min} w`;
    };

    // ─── Handlers zonas FC ──────────────────────────────────────────────────────

    const updateHrDraft = (idx: number, field: keyof HRZone, value: string | number) => {
        setHrDraft((prev) =>
            prev.map((z, i) =>
                i === idx ? { ...z, [field]: field === "name" || field === "color" ? value : Number(value) } : z
            )
        );
    };

    const addZone = () => {
        if (hrDraft.length >= 10) return;
        const lastZone = hrDraft[hrDraft.length - 1];
        const newZone: HRZone = {
            zone: hrDraft.length + 1,
            name: `Zona ${hrDraft.length + 1}`,
            min: lastZone.max,
            max: lastZone.max + 20,
            color: ZONE_COLORS[hrDraft.length % ZONE_COLORS.length],
        };
        setHrDraft((prev) => [...prev, newZone]);
    };

    const removeZone = (idx: number) => {
        if (hrDraft.length <= 2) return; // mínimo 2 zonas
        setHrDraft((prev) =>
            prev
                .filter((_, i) => i !== idx)
                .map((z, i) => ({ ...z, zone: i + 1 })) // renumera
        );
    };

    const handleSaveHRZones = async () => {
        setSaving(true);
        const res = await fetch("/api/user/zones", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hrZones: hrDraft }),
        });
        if (res.ok) {
            setHrZones(hrDraft);
            setEditingHR(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        }
        setSaving(false);
    };

    const handleSaveFTP = async () => {
        setSaving(true);
        await fetch("/api/user/zones", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ftpWatts: ftp }),
        });
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="animate-fade-up">
                <h1 className="font-display text-3xl text-white tracking-wide">ZONAS DE TREINO</h1>
                <p className="text-neutral-500 text-sm mt-0.5">Potência baseada no FTP · FC definida manualmente</p>
            </div>

            {/* Config cards */}
            <div className="animate-fade-up delay-100 grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* FTP */}
                <div className={cn("bg-dark-800 border rounded-2xl p-5 transition-all", hasFTP ? "border-yellow-500/20" : "border-red-500/20")}>
                    <div className="flex items-center gap-3 mb-4">
                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", hasFTP ? "bg-yellow-500/15" : "bg-red-500/10")}>
                            <Zap className={cn("w-4 h-4", hasFTP ? "text-yellow-400" : "text-red-400")} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-white">FTP</p>
                            <p className="text-xs text-neutral-500">Functional Threshold Power</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <input
                            type="number"
                            value={ftp || ""}
                            onChange={(e) => setFtp(Number(e.target.value))}
                            placeholder="Ex: 250"
                            className="flex-1 bg-dark-700 border border-white/8 rounded-xl px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-yellow-500/50 transition-colors"
                        />
                        <span className="text-sm text-neutral-500 shrink-0">w</span>
                        <button
                            onClick={handleSaveFTP}
                            disabled={saving || !ftp}
                            className="flex items-center gap-1.5 bg-yellow-500/15 border border-yellow-500/25 text-yellow-300 hover:bg-yellow-500/25 text-xs px-3 py-2 rounded-xl transition-all disabled:opacity-40"
                        >
                            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                            Guardar
                        </button>
                    </div>
                    {wattsPerKg && (
                        <p className="text-xs text-neutral-500">
                            <span className="text-yellow-400 font-mono font-semibold">{wattsPerKg} w/kg</span>
                            {" — "}
                            {parseFloat(wattsPerKg) >= 5 ? "Profissional 🏆" :
                                parseFloat(wattsPerKg) >= 4 ? "Elite Amateur ⭐" :
                                    parseFloat(wattsPerKg) >= 3.5 ? "Avançado 💪" :
                                        parseFloat(wattsPerKg) >= 3 ? "Intermédio 🚴" : "Iniciante 🌱"}
                        </p>
                    )}
                    {!hasFTP && (
                        <p className="text-xs text-red-400/80 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Sem potenciómetro? Usa as zonas de FC.
                        </p>
                    )}
                </div>

                {/* FC resumo */}
                <div className="bg-dark-800 border border-red-500/20 rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 bg-red-500/10 rounded-xl flex items-center justify-center">
                            <Heart className="w-4 h-4 text-red-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white">Zonas de FC</p>
                            <p className="text-xs text-neutral-500">{hrZones.length} zonas definidas</p>
                        </div>
                    </div>
                    <div className="space-y-1 mb-3">
                        {hrZones.map((z) => (
                            <div key={z.zone} className="flex items-center gap-2 text-xs">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: z.color }} />
                                <span className="text-neutral-400 w-5 shrink-0">Z{z.zone}</span>
                                <span className="text-neutral-500 flex-1 truncate">{z.name}</span>
                                <span className="ml-auto font-mono text-white shrink-0">{z.min}–{z.max} bpm</span>
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={() => { setHrDraft([...hrZones]); setEditingHR(true); }}
                        className="w-full flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/20 text-xs font-medium py-2 rounded-xl transition-all"
                    >
                        <Settings className="w-3.5 h-3.5" />
                        Editar Zonas de FC
                    </button>
                    {estimatedMaxHR && (
                        <p className="text-xs text-neutral-600 mt-2 flex items-center gap-1">
                            <Info className="w-3 h-3 shrink-0" />
                            FC máx. estimada das atividades: <span className="text-neutral-400 font-mono ml-1">{estimatedMaxHR} bpm</span>
                        </p>
                    )}
                </div>
            </div>

            {/* ─── Modal de edição das zonas de FC ─────────────────────────────────── */}
            {editingHR && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-dark-800 border border-white/10 rounded-2xl w-full max-w-lg animate-fade-up max-h-[90vh] flex flex-col">

                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-white/5 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center">
                                    <Heart className="w-4 h-4 text-red-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white">Editar Zonas de FC</h3>
                                    <p className="text-xs text-neutral-500">{hrDraft.length} zona{hrDraft.length !== 1 ? "s" : ""} · máx. 10</p>
                                </div>
                            </div>
                            <button onClick={() => setEditingHR(false)} className="text-neutral-500 hover:text-white transition-colors text-xs">
                                Cancelar
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-5 space-y-3 overflow-y-auto flex-1">
                            {estimatedMaxHR && (
                                <div className="bg-blue-500/8 border border-blue-500/20 rounded-xl px-3 py-2.5 flex items-start gap-2">
                                    <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                                    <p className="text-xs text-blue-300/80">
                                        FC máxima estimada: <span className="font-mono font-semibold text-blue-300">{estimatedMaxHR} bpm</span>. Usa como referência para a zona mais alta.
                                    </p>
                                </div>
                            )}

                            {/* Cabeçalho */}
                            <div className="grid grid-cols-12 gap-2 px-1">
                                <div className="col-span-1" />
                                <div className="col-span-4 text-xs text-neutral-500 uppercase tracking-wider">Nome</div>
                                <div className="col-span-3 text-xs text-neutral-500 uppercase tracking-wider text-center">Mín</div>
                                <div className="col-span-3 text-xs text-neutral-500 uppercase tracking-wider text-center">Máx</div>
                                <div className="col-span-1" />
                            </div>

                            {/* Zonas */}
                            {hrDraft.map((zone, idx) => (
                                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                                    {/* Badge cor */}
                                    <div className="col-span-1 flex items-center justify-center">
                                        <div
                                            className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold cursor-pointer hover:scale-110 transition-transform"
                                            style={{ background: `${zone.color}25`, color: zone.color }}
                                            title="Clica para mudar a cor"
                                            onClick={() => {
                                                const nextColor = ZONE_COLORS[(ZONE_COLORS.indexOf(zone.color) + 1) % ZONE_COLORS.length];
                                                updateHrDraft(idx, "color", nextColor);
                                            }}
                                        >
                                            {zone.zone}
                                        </div>
                                    </div>

                                    {/* Nome */}
                                    <div className="col-span-4">
                                        <input
                                            value={zone.name}
                                            onChange={(e) => updateHrDraft(idx, "name", e.target.value)}
                                            className="w-full bg-dark-700 border border-white/8 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-red-500/40 transition-colors"
                                        />
                                    </div>

                                    {/* Min */}
                                    <div className="col-span-3">
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={zone.min}
                                                onChange={(e) => updateHrDraft(idx, "min", e.target.value)}
                                                className="w-full bg-dark-700 border border-white/8 rounded-lg px-2 py-2 text-xs text-white font-mono text-center focus:outline-none focus:border-red-500/40 transition-colors pr-6"
                                            />
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-neutral-600">bpm</span>
                                        </div>
                                    </div>

                                    {/* Max */}
                                    <div className="col-span-3">
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={zone.max}
                                                onChange={(e) => updateHrDraft(idx, "max", e.target.value)}
                                                className="w-full bg-dark-700 border border-white/8 rounded-lg px-2 py-2 text-xs text-white font-mono text-center focus:outline-none focus:border-red-500/40 transition-colors pr-6"
                                            />
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-neutral-600">bpm</span>
                                        </div>
                                    </div>

                                    {/* Remover */}
                                    <div className="col-span-1 flex items-center justify-center">
                                        <button
                                            onClick={() => removeZone(idx)}
                                            disabled={hrDraft.length <= 2}
                                            className="w-6 h-6 rounded-lg flex items-center justify-center text-neutral-600 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                                            title="Remover zona"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {/* Adicionar zona */}
                            {hrDraft.length < 10 && (
                                <button
                                    onClick={addZone}
                                    className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-white/10 hover:border-brand-500/40 text-neutral-500 hover:text-brand-400 text-xs py-2.5 rounded-xl transition-all"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Adicionar Zona
                                </button>
                            )}

                            <p className="text-xs text-neutral-600 flex items-center gap-1 pt-1">
                                <Info className="w-3 h-3 shrink-0" />
                                Clica no número colorido para mudar a cor da zona · Mínimo 2, máximo 10 zonas
                            </p>
                        </div>

                        {/* Footer */}
                        <div className="flex gap-3 p-5 border-t border-white/5 shrink-0">
                            <button
                                onClick={() => setHrDraft([...DEFAULT_HR_ZONES])}
                                className="flex-1 py-2.5 rounded-xl bg-dark-700 border border-white/8 text-neutral-400 hover:text-white text-sm transition-all"
                            >
                                Repor Padrão
                            </button>
                            <button
                                onClick={handleSaveHRZones}
                                disabled={saving}
                                className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                style={{ background: "linear-gradient(135deg, #2B8FBF, #1A5A80)" }}
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Guardar Zonas
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="animate-fade-up delay-200 flex items-center gap-1 bg-dark-900 border border-white/8 rounded-xl p-1 w-fit">
                <button
                    onClick={() => setActiveTab("power")}
                    className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all", activeTab === "power" ? "bg-yellow-500/15 text-yellow-300 border border-yellow-500/25" : "text-neutral-500 hover:text-neutral-200")}
                >
                    <Zap className="w-4 h-4" /> Potência
                </button>
                <button
                    onClick={() => setActiveTab("hr")}
                    className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all", activeTab === "hr" ? "bg-red-500/15 text-red-300 border border-red-500/25" : "text-neutral-500 hover:text-neutral-200")}
                >
                    <Heart className="w-4 h-4" /> Frequência Cardíaca
                </button>
            </div>

            {/* Zonas de Potência */}
            {activeTab === "power" && (
                <div className="space-y-3 animate-fade-up delay-300">
                    {!hasFTP && (
                        <div className="bg-yellow-500/8 border border-yellow-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
                            <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0" />
                            <p className="text-sm text-yellow-300/80">
                                Sem potenciómetro? Sem problema — usa as{" "}
                                <button onClick={() => setActiveTab("hr")} className="underline hover:text-yellow-200">Zonas de FC</button>.
                            </p>
                        </div>
                    )}
                    {POWER_ZONES.map((zone) => (
                        <div
                            key={zone.zone}
                            className="rounded-2xl border overflow-hidden transition-all cursor-pointer hover:border-white/15"
                            style={{ borderColor: zone.borderColor, backgroundColor: zone.bgColor }}
                            onClick={() => setExpandedZone(expandedZone === zone.zone ? null : zone.zone)}
                        >
                            <div className="flex items-center gap-4 p-4">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-sm shrink-0" style={{ background: `${zone.color}25`, color: zone.color }}>
                                    {zone.label}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-semibold text-white">{zone.name}</p>
                                        <span className="text-xs font-mono px-2 py-0.5 rounded-lg font-semibold" style={{ background: `${zone.color}20`, color: zone.color }}>
                                            {getPowerRange(zone.minPct, zone.maxPct)}
                                        </span>
                                        <span className="text-xs text-neutral-600">{zone.minPct}%{zone.maxPct ? `–${zone.maxPct}%` : "+"} FTP · RPE {zone.rpe}</span>
                                    </div>
                                    <div className="mt-2 h-1.5 bg-dark-700 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full" style={{ width: `${Math.min((zone.maxPct ?? 160) - zone.minPct, 100) * 0.6}%`, background: zone.color, opacity: 0.7, marginLeft: `${zone.minPct * 0.3}%` }} />
                                    </div>
                                </div>
                                <ChevronRight className={cn("w-4 h-4 shrink-0 transition-transform", expandedZone === zone.zone ? "rotate-90" : "")} style={{ color: zone.color }} />
                            </div>
                            {expandedZone === zone.zone && (
                                <div className="px-4 pb-4 pt-0 border-t" style={{ borderColor: zone.borderColor }}>
                                    <div className="pt-3 space-y-2">
                                        <p className="text-sm text-neutral-300">{zone.description}</p>
                                        <p className="text-xs text-neutral-500 flex items-start gap-1.5"><span>💬</span>{zone.feel}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Zonas de FC */}
            {activeTab === "hr" && (
                <div className="space-y-3 animate-fade-up delay-300">
                    {hrZones.map((zone, idx) => (
                        <div
                            key={idx}
                            className="rounded-2xl border overflow-hidden transition-all cursor-pointer hover:border-white/15"
                            style={{ borderColor: `${zone.color}30`, backgroundColor: `${zone.color}10` }}
                            onClick={() => setExpandedZone(expandedZone === idx + 20 ? null : idx + 20)}
                        >
                            <div className="flex items-center gap-4 p-4">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-sm shrink-0" style={{ background: `${zone.color}25`, color: zone.color }}>
                                    Z{zone.zone}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-semibold text-white">{zone.name}</p>
                                        <span className="text-xs font-mono px-2 py-0.5 rounded-lg font-semibold" style={{ background: `${zone.color}20`, color: zone.color }}>
                                            {zone.min} – {zone.max} bpm
                                        </span>
                                    </div>
                                    <div className="mt-2 h-1.5 bg-dark-700 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full" style={{ width: `${Math.min((zone.max - zone.min) * 1.5, 80)}%`, background: zone.color, opacity: 0.7, marginLeft: `${Math.max((zone.min - 80) * 0.5, 0)}%` }} />
                                    </div>
                                </div>
                                <ChevronRight className={cn("w-4 h-4 shrink-0 transition-transform", expandedZone === idx + 20 ? "rotate-90" : "")} style={{ color: zone.color }} />
                            </div>
                            {expandedZone === idx + 20 && (
                                <div className="px-4 pb-4 pt-0 border-t" style={{ borderColor: `${zone.color}20` }}>
                                    <p className="pt-3 text-sm text-neutral-300">
                                        Zona personalizada · {zone.min}–{zone.max} bpm
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}

                    <button
                        onClick={() => { setHrDraft([...hrZones]); setEditingHR(true); }}
                        className="w-full flex items-center justify-center gap-2 bg-dark-800 border border-white/8 text-neutral-400 hover:text-white hover:border-white/15 text-sm py-3 rounded-2xl transition-all"
                    >
                        <Settings className="w-4 h-4" />
                        Editar Zonas de FC
                    </button>
                </div>
            )}

            {/* Link definições */}
            <div className="animate-fade-up delay-400 bg-dark-800 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-dark-700 rounded-lg flex items-center justify-center">
                        <Settings className="w-4 h-4 text-neutral-400" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-white">Atualizar FTP ou Peso</p>
                        <p className="text-xs text-neutral-500">Nas definições do perfil</p>
                    </div>
                </div>
                <Link href="/settings" className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors font-medium">
                    Ir para Definições <ChevronRight className="w-3.5 h-3.5" />
                </Link>
            </div>
        </div>
    );
}