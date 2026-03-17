"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronLeft, ChevronRight, Plus, X, Loader2,
  Bike, Clock, Mountain, ChevronDown, Users, Calendar,
  Check, Upload, CheckCircle
} from "lucide-react";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday,
  parseISO, isBefore, startOfDay
} from "date-fns";
import { pt } from "date-fns/locale";
import type { PlannedActivity } from "@/types";
import { cn, activityTypeEmoji } from "@/lib/utils";
import { parseGPX } from "@/lib/gpx";

interface Team { id: string; name: string }
interface Props { userId: string; teams: Team[] }

const TYPE_OPTIONS = [
  { value: "ride", label: "Ciclismo", emoji: "🚴" },
  { value: "run", label: "Corrida", emoji: "🏃" },
  { value: "walk", label: "Caminhada", emoji: "🚶" },
  { value: "swim", label: "Natação", emoji: "🏊" },
  { value: "hike", label: "Trekking", emoji: "🥾" },
];

const ACTIVITY_COLORS: Record<string, string> = {
  ride: "bg-brand-500/20 border-brand-500/40 text-brand-300",
  run: "bg-green-500/20 border-green-500/40 text-green-300",
  walk: "bg-blue-500/20 border-blue-500/40 text-blue-300",
  swim: "bg-cyan-500/20 border-cyan-500/40 text-cyan-300",
  hike: "bg-purple-500/20 border-purple-500/40 text-purple-300",
};

function EquipaDropdown({
  teams, value, onChange,
}: {
  teams: Team[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const options = [{ id: "", name: "Apenas para mim" }, ...teams];
  const selected = options.find((o) => o.id === value) ?? options[0];

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/8 bg-dark-700 text-sm text-white hover:border-white/20 transition-all"
      >
        <Users className="w-4 h-4 text-neutral-500 shrink-0" />
        <span className="flex-1 text-left">{selected.name}</span>
        <ChevronDown className={cn("w-4 h-4 text-neutral-500 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute z-50 bottom-full mb-1.5 w-full bg-dark-700 border border-white/10 rounded-xl overflow-hidden shadow-xl">
          <div className="py-1">
            {options.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => { onChange(o.id); setOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors",
                  value === o.id
                    ? "bg-brand-500/15 text-white"
                    : "text-neutral-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <Users className="w-4 h-4 shrink-0 opacity-60" />
                <span className="flex-1">{o.name}</span>
                {value === o.id && <Check className="w-3.5 h-3.5 text-brand-400 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CalendarClient({ userId, teams }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activities, setActivities] = useState<PlannedActivity[]>([]);
  const [realActivities, setRealActivities] = useState<{
    id: string; title: string; type: string; startedAt: string;
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<PlannedActivity | null>(null);
  const [saving, setSaving] = useState(false);
  const [gpxParsed, setGpxParsed] = useState(false);
  const [gpxFileName, setGpxFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "", type: "ride", description: "",
    targetDistanceKm: "", targetDurationMin: "", targetWatts: "",
    scheduledFor: "", teamId: "", isTeamShared: false,
  });

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    const from = format(startOfMonth(currentDate), "yyyy-MM-dd");
    const to = format(endOfMonth(currentDate), "yyyy-MM-dd");
    const params = new URLSearchParams({ from, to });
    if (selectedTeam) params.set("teamId", selectedTeam);

    const [calendarRes, activitiesRes] = await Promise.all([
      fetch(`/api/calendar?${params}`),
      fetch(`/api/activities?limit=100&from=${from}&to=${to}`),
    ]);

    if (calendarRes.ok) setActivities(await calendarRes.json());
    if (activitiesRes.ok) {
      const data = await activitiesRes.json();
      setRealActivities(data.activities ?? []);
    }
    setLoading(false);
  }, [currentDate, selectedTeam]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  const openForm = (date?: Date) => {
    const d = date ?? new Date();
    setSelectedDate(d);
    setForm((f) => ({ ...f, scheduledFor: format(d, "yyyy-MM-dd'T'09:00"), teamId: selectedTeam ?? "" }));
    setShowForm(true);
  };

  const resetForm = () => {
    setForm({ title: "", type: "ride", description: "", targetDistanceKm: "", targetDurationMin: "", targetWatts: "", scheduledFor: "", teamId: "", isTeamShared: false });
    setGpxParsed(false);
    setGpxFileName("");
  };

  const handleGPX = async (file: File) => {
    try {
      const text = await file.text();
      const data = parseGPX(text);
      setForm((f) => ({
        ...f,
        title: data.title,
        type: "ride",
        targetDistanceKm: String(data.distanceKm),
        targetDurationMin: String(Math.round(data.durationSeconds / 60)),
        scheduledFor: f.scheduledFor || data.startedAt.slice(0, 16),
      }));
      setGpxParsed(true);
      setGpxFileName(file.name);
    } catch {
      alert("Erro ao ler o ficheiro GPX.");
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".gpx")) handleGPX(file);
  };

  const handleSave = async () => {
    if (!form.title || !form.scheduledFor) return;
    setSaving(true);
    const res = await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        type: form.type,
        description: form.description || null,
        targetDistanceKm: form.targetDistanceKm ? parseFloat(form.targetDistanceKm) : null,
        targetDurationMin: form.targetDurationMin ? parseInt(form.targetDurationMin) : null,
        targetWatts: form.targetWatts ? parseInt(form.targetWatts) : null,
        scheduledFor: new Date(form.scheduledFor).toISOString(),
        teamId: form.teamId || null,
        isTeamShared: form.isTeamShared,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setShowForm(false);
      resetForm();
      fetchActivities();
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/calendar/${id}`, { method: "DELETE" });
    setSelectedActivity(null);
    fetchActivities();
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let d = gridStart;
  while (d <= gridEnd) { days.push(d); d = addDays(d, 1); }

  const getActivitiesForDay = (day: Date) =>
    activities.filter((a) => isSameDay(parseISO(a.scheduledFor), day));

  const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="font-display text-3xl text-white tracking-wide">CALENDÁRIO</h1>
          <p className="text-neutral-500 text-sm mt-0.5">Planeia os teus treinos</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {teams.length > 0 && (
            <div className="relative">
              <select
                value={selectedTeam ?? ""}
                onChange={(e) => setSelectedTeam(e.target.value || null)}
                className="appearance-none bg-dark-800 border border-white/10 text-white text-sm rounded-xl pl-4 pr-10 py-2.5 focus:outline-none focus:border-brand-500 cursor-pointer"
              >
                <option value="">Os meus treinos</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
            </div>
          )}
          <button
            onClick={() => openForm()}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-all"
          >
            <Plus className="w-4 h-4" /> Novo Treino
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div className="animate-fade-up delay-100 bg-dark-800 border border-white/5 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="w-8 h-8 rounded-lg bg-dark-700 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-dark-600 transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="font-semibold text-white capitalize">
            {format(currentDate, "MMMM yyyy", { locale: pt })}
          </h2>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="w-8 h-8 rounded-lg bg-dark-700 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-dark-600 transition-all">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 border-b border-white/5">
          {weekDays.map((wd) => (
            <div key={wd} className="py-2.5 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">{wd}</div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const dayActs = getActivitiesForDay(day);
            const inMonth = isSameMonth(day, currentDate);
            const today = isToday(day);
            const isPastDay = isBefore(startOfDay(day), startOfDay(new Date()));
            return (
              <div
                key={i}
                onClick={() => !isPastDay && openForm(day)}
                className={cn(
                  "min-h-[100px] p-2 border-b border-r border-white/5 transition-colors",
                  !inMonth && "opacity-30",
                  today && "bg-brand-500/5",
                  isPastDay ? "cursor-default opacity-60" : "cursor-pointer hover:bg-white/3"
                )}
              >
                <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-sm font-medium mb-1.5", today ? "bg-brand-500 text-white font-bold" : "text-neutral-400")}>
                  {format(day, "d")}
                </div>
                <div className="space-y-0.5">
                  {dayActs.slice(0, 3).map((act) => (
                    <div
                      key={act.id}
                      onClick={(e) => { e.stopPropagation(); setSelectedActivity(act); }}
                      className={cn("text-xs px-1.5 py-0.5 rounded border truncate cursor-pointer hover:opacity-90", ACTIVITY_COLORS[act.type] ?? ACTIVITY_COLORS.ride)}
                    >
                      {activityTypeEmoji(act.type)} {act.title}
                    </div>
                  ))}

                  {dayActs.length > 3 && <p className="text-xs text-neutral-500 pl-1">+{dayActs.length - 3} mais</p>}

                  {/* Atividades reais */}
                  {realActivities
                    .filter((a) => isSameDay(parseISO(a.startedAt), day))
                    .slice(0, 2)
                    .map((act) => (
                      <div
                        key={act.id}
                        className="text-xs px-1.5 py-0.5 rounded border truncate bg-[#FC4C02]/15 border-[#FC4C02]/30 text-[#FC4C02]"
                      >
                        {activityTypeEmoji(act.type)} {act.title}
                      </div>
                    ))
                  }

                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-800 border border-white/10 rounded-2xl p-6 w-full max-w-md animate-fade-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-white text-lg">Planear Treino</h3>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="text-neutral-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedDate && (
              <div className="flex items-center gap-2 text-xs text-neutral-500 mb-5 bg-dark-700 px-3 py-2 rounded-xl">
                <Calendar className="w-3.5 h-3.5" />
                {format(selectedDate, "EEEE, d 'de' MMMM", { locale: pt })}
              </div>
            )}

            {/* GPX Upload */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => !gpxParsed && fileRef.current?.click()}
              className={cn(
                "mb-5 rounded-xl border-2 border-dashed p-4 text-center transition-all",
                gpxParsed
                  ? "border-brand-500/40 bg-brand-500/8 cursor-default"
                  : "border-white/10 bg-dark-700 hover:border-brand-500/40 hover:bg-brand-500/5 cursor-pointer"
              )}
            >
              {gpxParsed ? (
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle className="w-5 h-5 text-brand-400 shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">{gpxFileName}</p>
                    <p className="text-xs text-brand-400">Dados importados com sucesso</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); resetForm(); }}
                    className="ml-auto text-neutral-500 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-2">
                  <div className="w-10 h-10 bg-dark-600 rounded-xl flex items-center justify-center">
                    <Upload className="w-5 h-5 text-neutral-400" />
                  </div>
                  <p className="text-sm text-neutral-400">
                    <span className="text-brand-400 font-medium">Clica</span> ou arrasta um ficheiro <span className="font-mono text-xs bg-dark-600 px-1.5 py-0.5 rounded">.gpx</span>
                  </p>
                  <p className="text-xs text-neutral-600">Os dados são preenchidos automaticamente</p>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".gpx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleGPX(file);
                }}
              />
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">Título *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex: Treino de fundo"
                  className="w-full bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">Tipo</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {TYPE_OPTIONS.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setForm({ ...form, type: t.value })}
                      className={cn(
                        "flex flex-col items-center gap-1 py-2 rounded-xl border text-xs transition-all",
                        form.type === t.value
                          ? "border-brand-500/50 bg-brand-500/10 text-brand-300"
                          : "border-white/8 bg-dark-700 text-neutral-500 hover:border-white/15"
                      )}
                    >
                      <span>{t.emoji}</span>
                      <span>{t.label.split(" ")[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">Data & Hora *</label>
                <input
                  type="datetime-local"
                  value={form.scheduledFor}
                  onChange={(e) => setForm({ ...form, scheduledFor: e.target.value })}
                  className="w-full bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 [color-scheme:dark]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block flex items-center gap-1">
                    <Bike className="w-3 h-3" /> Km
                  </label>
                  <input type="number" value={form.targetDistanceKm} onChange={(e) => setForm({ ...form, targetDistanceKm: e.target.value })} placeholder="0" className="w-full bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-brand-500" />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Min
                  </label>
                  <input type="number" value={form.targetDurationMin} onChange={(e) => setForm({ ...form, targetDurationMin: e.target.value })} placeholder="0" className="w-full bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-brand-500" />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block flex items-center gap-1">
                    <Mountain className="w-3 h-3" /> Watts
                  </label>
                  <input type="number" value={form.targetWatts} onChange={(e) => setForm({ ...form, targetWatts: e.target.value })} placeholder="0" className="w-full bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-brand-500" />
                </div>
              </div>

              <div>
                <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">Notas</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Detalhes do treino..."
                  rows={2}
                  className="w-full bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-brand-500 resize-none"
                />
              </div>

              {teams.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs text-neutral-400 uppercase tracking-wider block">Equipa</label>
                  <EquipaDropdown
                    teams={teams}
                    value={form.teamId}
                    onChange={(id) => setForm({ ...form, teamId: id, isTeamShared: false })}
                  />
                  {form.teamId && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, isTeamShared: !form.isTeamShared })}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm transition-all",
                        form.isTeamShared
                          ? "border-accent-500/40 bg-accent-500/10 text-white"
                          : "border-white/8 bg-dark-700 text-neutral-400 hover:border-white/15 hover:text-white"
                      )}
                    >
                      <div className={cn("w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all", form.isTeamShared ? "bg-accent-500 border-accent-500" : "border-neutral-600")}>
                        {form.isTeamShared && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      Partilhar no calendário da equipa
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowForm(false); resetForm(); }} className="flex-1 py-2.5 rounded-xl bg-dark-700 border border-white/8 text-neutral-400 hover:text-white text-sm transition-all">Cancelar</button>
              <button
                onClick={handleSave}
                disabled={saving || !form.title}
                className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity detail modal */}
      {selectedActivity && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedActivity(null)}>
          <div className="bg-dark-800 border border-white/10 rounded-2xl p-6 w-full max-w-sm animate-fade-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-2xl">{activityTypeEmoji(selectedActivity.type)}</div>
                <div>
                  <h3 className="font-semibold text-white">{selectedActivity.title}</h3>
                  <p className="text-xs text-neutral-500">
                    {format(parseISO(selectedActivity.scheduledFor), "d 'de' MMMM, HH:mm", { locale: pt })}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedActivity(null)} className="text-neutral-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            {selectedActivity.description && (
              <p className="text-sm text-neutral-400 mb-4">{selectedActivity.description}</p>
            )}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {selectedActivity.targetDistanceKm && (
                <div className="bg-dark-700 rounded-xl p-2.5 text-center">
                  <p className="text-sm font-bold text-white">{selectedActivity.targetDistanceKm} km</p>
                  <p className="text-xs text-neutral-500">distância</p>
                </div>
              )}
              {selectedActivity.targetDurationMin && (
                <div className="bg-dark-700 rounded-xl p-2.5 text-center">
                  <p className="text-sm font-bold text-white">{selectedActivity.targetDurationMin} min</p>
                  <p className="text-xs text-neutral-500">duração</p>
                </div>
              )}
              {selectedActivity.targetWatts && (
                <div className="bg-dark-700 rounded-xl p-2.5 text-center">
                  <p className="text-sm font-bold text-white">{selectedActivity.targetWatts} w</p>
                  <p className="text-xs text-neutral-500">objetivo</p>
                </div>
              )}
            </div>
            {selectedActivity.user && selectedActivity.user.id !== userId && (
              <div className="flex items-center gap-2 text-xs text-neutral-500 mb-4 bg-dark-700 px-3 py-2 rounded-xl">
                <Users className="w-3.5 h-3.5" />
                Planeado por {selectedActivity.user.name}
              </div>
            )}
            {selectedActivity.user?.id === userId && (
              <button
                onClick={() => handleDelete(selectedActivity.id)}
                className="w-full py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-sm transition-all"
              >
                Eliminar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}