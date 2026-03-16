"use client";
import { useState, useEffect, useCallback } from "react";
import {
    Plus, X, Loader2, Trophy, Calendar, Users,
    ChevronDown, Flag, MapPin
} from "lucide-react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Team { id: string; name: string }
interface User { id: string; name: string; avatar?: string | null }

interface Tour {
    id: string; name: string; description?: string | null;
    type: string; status: string; startDate: string; endDate: string;
    organiser: { id: string; name: string };
    team?: { id: string; name: string } | null;
    _count: { participants: number; stages: number };
}

interface Props {
    userId: string;
    teams: Team[];
    allUsers: User[];
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    upcoming: { label: "Em breve", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
    active: { label: "A decorrer", color: "text-green-400 bg-green-400/10 border-green-400/20" },
    finished: { label: "Terminado", color: "text-neutral-500 bg-neutral-500/10 border-neutral-500/20" },
};

const TYPE_LABELS: Record<string, string> = {
    single: "Corrida de 1 dia",
    multistage: "Tour multi-etapa",
};

export default function TourListClient({ userId, teams, allUsers }: Props) {
    const [tours, setTours] = useState<Tour[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        name: "", description: "", type: "multistage",
        teamId: "", startDate: "", endDate: "",
    });
    const [inviteSearch, setInviteSearch] = useState("");
    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);

    const fetchTours = useCallback(async () => {
        setLoading(true);
        const res = await fetch("/api/tours");
        if (res.ok) setTours(await res.json());
        setLoading(false);
    }, []);

    useEffect(() => { fetchTours(); }, [fetchTours]);

    const filteredUsers = allUsers.filter(
        (u) =>
            u.name.toLowerCase().includes(inviteSearch.toLowerCase()) &&
            !selectedUsers.find((s) => s.id === u.id)
    );

    const handleCreate = async () => {
        if (!form.name || !form.startDate || !form.endDate) return;
        setSaving(true);

        const res = await fetch("/api/tours", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: form.name,
                description: form.description || null,
                type: form.type,
                teamId: form.teamId || null,
                startDate: new Date(form.startDate).toISOString(),
                endDate: new Date(form.endDate).toISOString(),
            }),
        });

        if (res.ok) {
            const tour = await res.json();

            // Convidar utilizadores selecionados
            for (const user of selectedUsers) {
                await fetch(`/api/tours/${tour.id}/invite`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId: user.id }),
                });
            }

            setShowForm(false);
            setForm({ name: "", description: "", type: "multistage", teamId: "", startDate: "", endDate: "" });
            setSelectedUsers([]);
            fetchTours();
        }
        setSaving(false);
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between animate-fade-up">
                <div>
                    <h1 className="font-display text-3xl text-white tracking-wide">TOUR</h1>
                    <p className="text-neutral-500 text-sm mt-0.5">Organiza e compete no teu tour</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-all"
                >
                    <Plus className="w-4 h-4" /> Criar Tour
                </button>
            </div>

            {/* Tours list */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                </div>
            ) : tours.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-up">
                    <div className="w-16 h-16 bg-dark-800 border border-white/8 rounded-2xl flex items-center justify-center mb-4">
                        <Trophy className="w-8 h-8 text-neutral-600" />
                    </div>
                    <p className="text-neutral-400 font-medium mb-1">Sem tours ainda</p>
                    <p className="text-neutral-600 text-sm mb-6">Cria o teu primeiro tour e convida os participantes.</p>
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-all"
                    >
                        <Plus className="w-4 h-4" /> Criar Tour
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-up delay-100">
                    {tours.map((tour, i) => {
                        const status = STATUS_LABELS[tour.status] ?? STATUS_LABELS.upcoming;
                        return (
                            <Link
                                key={tour.id}
                                href={`/tour/${tour.id}`}
                                className="bg-dark-800 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all group"
                                style={{ animationDelay: `${i * 60}ms` }}
                            >
                                {/* Top */}
                                <div className="flex items-start justify-between gap-3 mb-4">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                            style={{ background: "linear-gradient(135deg, rgba(43,143,191,0.3), rgba(232,23,122,0.3))" }}
                                        >
                                            <Flag className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-white group-hover:text-brand-300 transition-colors">{tour.name}</p>
                                            <p className="text-xs text-neutral-500">{TYPE_LABELS[tour.type]}</p>
                                        </div>
                                    </div>
                                    <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium shrink-0", status.color)}>
                                        {status.label}
                                    </span>
                                </div>

                                {/* Info */}
                                <div className="flex items-center gap-4 text-xs text-neutral-500 mb-3">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {format(parseISO(tour.startDate), "d MMM", { locale: pt })} → {format(parseISO(tour.endDate), "d MMM yyyy", { locale: pt })}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Users className="w-3.5 h-3.5" />
                                        {tour._count.participants} participantes
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <MapPin className="w-3.5 h-3.5" />
                                        {tour._count.stages} etapas
                                    </span>
                                </div>

                                {/* Footer */}
                                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                    <p className="text-xs text-neutral-500">
                                        Organizado por <span className="text-neutral-300">{tour.organiser.name}</span>
                                    </p>
                                    {tour.team && (
                                        <span className="text-xs bg-brand-500/10 text-brand-400 border border-brand-500/20 px-2 py-0.5 rounded-full">
                                            {tour.team.name}
                                        </span>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* Create modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-dark-800 border border-white/10 rounded-2xl p-6 w-full max-w-lg animate-fade-up max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="font-semibold text-white text-lg">Criar Tour</h3>
                            <button onClick={() => setShowForm(false)} className="text-neutral-500 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Nome */}
                            <div>
                                <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">Nome *</label>
                                <input
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder="Ex: Tour de Freixo 2026"
                                    className="w-full bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-brand-500"
                                />
                            </div>

                            {/* Tipo */}
                            <div>
                                <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">Tipo</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { value: "multistage", label: "Multi-etapa", desc: "Várias etapas em dias diferentes" },
                                        { value: "single", label: "1 Dia", desc: "Corrida de uma única etapa" },
                                    ].map((t) => (
                                        <button
                                            key={t.value}
                                            onClick={() => setForm({ ...form, type: t.value })}
                                            className={cn(
                                                "p-3 rounded-xl border text-left transition-all",
                                                form.type === t.value
                                                    ? "border-brand-500/40 bg-brand-500/10"
                                                    : "border-white/8 bg-dark-700 hover:border-white/15"
                                            )}
                                        >
                                            <p className={cn("text-sm font-medium", form.type === t.value ? "text-brand-300" : "text-white")}>{t.label}</p>
                                            <p className="text-xs text-neutral-500 mt-0.5">{t.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Datas */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">Início *</label>
                                    <input
                                        type="date"
                                        value={form.startDate}
                                        onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                                        className="w-full bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 [color-scheme:dark]"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">Fim *</label>
                                    <input
                                        type="date"
                                        value={form.endDate}
                                        onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                                        className="w-full bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 [color-scheme:dark]"
                                    />
                                </div>
                            </div>

                            {/* Descrição */}
                            <div>
                                <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">Descrição</label>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    placeholder="Detalhes do tour..."
                                    rows={2}
                                    className="w-full bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-brand-500 resize-none"
                                />
                            </div>

                            {/* Equipa */}
                            {teams.length > 0 && (
                                <div>
                                    <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">Equipa (opcional)</label>
                                    <div className="relative">
                                        <select
                                            value={form.teamId}
                                            onChange={(e) => setForm({ ...form, teamId: e.target.value })}
                                            className="w-full appearance-none bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 cursor-pointer pr-10"
                                        >
                                            <option value="">Sem equipa associada</option>
                                            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
                                    </div>
                                </div>
                            )}

                            {/* Convidar participantes */}
                            <div>
                                <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">Convidar Participantes</label>
                                <input
                                    type="text"
                                    value={inviteSearch}
                                    onChange={(e) => setInviteSearch(e.target.value)}
                                    placeholder="Pesquisar utilizadores..."
                                    className="w-full bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-brand-500 mb-2"
                                />

                                {/* Resultados da pesquisa */}
                                {inviteSearch.length > 0 && filteredUsers.length > 0 && (
                                    <div className="bg-dark-700 border border-white/8 rounded-xl overflow-hidden mb-2 max-h-36 overflow-y-auto">
                                        {filteredUsers.slice(0, 5).map((u) => (
                                            <button
                                                key={u.id}
                                                onClick={() => { setSelectedUsers([...selectedUsers, u]); setInviteSearch(""); }}
                                                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors text-left"
                                            >
                                                <div className="w-7 h-7 rounded-lg bg-brand-500/20 flex items-center justify-center shrink-0">
                                                    <span className="text-brand-400 text-xs font-bold">{u.name.charAt(0).toUpperCase()}</span>
                                                </div>
                                                <span className="text-sm text-white">{u.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Selecionados */}
                                {selectedUsers.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {selectedUsers.map((u) => (
                                            <span
                                                key={u.id}
                                                className="flex items-center gap-1.5 bg-brand-500/15 border border-brand-500/30 text-brand-300 text-xs px-2.5 py-1 rounded-full"
                                            >
                                                {u.name}
                                                <button onClick={() => setSelectedUsers(selectedUsers.filter((s) => s.id !== u.id))}>
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowForm(false)}
                                className="flex-1 py-2.5 rounded-xl bg-dark-700 border border-white/8 text-neutral-400 hover:text-white text-sm transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={saving || !form.name || !form.startDate || !form.endDate}
                                className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                Criar Tour
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 