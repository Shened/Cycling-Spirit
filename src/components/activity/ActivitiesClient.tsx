"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, X, Loader2, Filter, Bike, Mountain, Clock,
  Flame, Zap, ChevronLeft, ChevronRight, Upload,
  CheckCircle, Wind, Heart, MapPin
} from "lucide-react";
import type { Activity } from "@/types";
import { formatDuration, activityTypeEmoji, cn } from "@/lib/utils";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { parseGPX } from "@/lib/gpx";
import dynamic from "next/dynamic";

// Leaflet só funciona no browser
const ActivityMap = dynamic(() => import("./ActivityMap"), { ssr: false });

const TYPES = ["", "ride", "run", "walk", "swim", "hike"];
const TYPE_LABELS: Record<string, string> = {
  "": "Todos", ride: "Ciclismo", run: "Corrida",
  walk: "Caminhada", swim: "Natação", hike: "Trekking"
};

export default function ActivitiesClient({ userId }: { userId: string }) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gpxParsed, setGpxParsed] = useState(false);
  const [gpxFileName, setGpxFileName] = useState("");
  const [gpxPolyline, setGpxPolyline] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "", type: "ride", distanceKm: "", durationSeconds: "",
    elevationM: "", avgWatts: "", avgHeartRate: "", calories: "",
    avgSpeedKmh: "", startedAt: new Date().toISOString().slice(0, 16),
  });

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "15" });
    if (typeFilter) params.set("type", typeFilter);
    const res = await fetch(`/api/activities?${params}`);
    if (res.ok) {
      const data = await res.json();
      setActivities(data.activities);
      setTotal(data.total);
      setPages(data.pages);
    }
    setLoading(false);
  }, [page, typeFilter]);

  useEffect(() => { fetch_(); }, [fetch_]);
  useEffect(() => { setPage(1); }, [typeFilter]);

  const handleGPX = async (file: File) => {
    try {
      const text = await file.text();
      const data = parseGPX(text);

      // Converte pontos GPX para polyline encoded
      const polylineModule = await import("@mapbox/polyline");
      const encoded = polylineModule.default.encode(
        data.points.map((p) => [p.lat, p.lon])
      );
      setGpxPolyline(encoded);

      setForm({
        title: data.title,
        type: "ride",
        distanceKm: String(data.distanceKm),
        durationSeconds: String(Math.round(data.durationSeconds / 60)),
        elevationM: String(data.elevationM),
        avgWatts: "",
        avgHeartRate: "",
        calories: "",
        avgSpeedKmh: String(data.avgSpeedKmh),
        startedAt: data.startedAt.slice(0, 16),
      });
      setGpxParsed(true);
      setGpxFileName(file.name);
    } catch {
      alert("Erro ao ler o ficheiro GPX. Verifica se é válido.");
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".gpx")) handleGPX(file);
  };

  const resetForm = () => {
    setForm({
      title: "", type: "ride", distanceKm: "", durationSeconds: "",
      elevationM: "", avgWatts: "", avgHeartRate: "", calories: "",
      avgSpeedKmh: "", startedAt: new Date().toISOString().slice(0, 16),
    });
    setGpxParsed(false);
    setGpxFileName("");
    setGpxPolyline(null);
  };

  const handleCreate = async () => {
    if (!form.title || !form.distanceKm || !form.durationSeconds) return;
    setSaving(true);
    const res = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        type: form.type,
        distanceKm: parseFloat(form.distanceKm),
        durationSeconds: parseInt(form.durationSeconds) * 60,
        elevationM: form.elevationM ? parseInt(form.elevationM) : null,
        avgWatts: form.avgWatts ? parseInt(form.avgWatts) : null,
        avgHeartRate: form.avgHeartRate ? parseFloat(form.avgHeartRate) : null,
        avgSpeedKmh: form.avgSpeedKmh ? parseFloat(form.avgSpeedKmh) : null,
        calories: form.calories ? parseInt(form.calories) : null,
        polyline: gpxPolyline,
        startedAt: new Date(form.startedAt).toISOString(),
      }),
    });
    setSaving(false);
    if (res.ok) {
      setShowForm(false);
      resetForm();
      fetch_();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminar esta atividade?")) return;
    await fetch(`/api/activities/${id}`, { method: "DELETE" });
    setSelectedActivity(null);
    fetch_();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="font-display text-3xl text-white tracking-wide">ATIVIDADES</h1>
          <p className="text-neutral-500 text-sm mt-0.5">{total} atividades registadas</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-all"
        >
          <Plus className="w-4 h-4" /> Nova Atividade
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap animate-fade-up delay-100">
        <Filter className="w-4 h-4 text-neutral-500" />
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={cn(
              "text-xs px-3 py-1.5 rounded-lg border font-medium transition-all",
              typeFilter === t
                ? "bg-brand-500/15 border-brand-500/35 text-brand-300"
                : "bg-dark-800 border-white/8 text-neutral-500 hover:border-white/15 hover:text-neutral-300"
            )}
          >
            {t ? activityTypeEmoji(t) + " " : ""}{TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-dark-800 border border-white/5 rounded-2xl overflow-hidden animate-fade-up delay-200">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-4xl mb-3">🚴</div>
            <p className="text-neutral-400 font-medium mb-1">Sem atividades</p>
            <p className="text-neutral-600 text-sm">Regista a tua primeira atividade.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {activities.map((act, i) => (
              <div
                key={act.id}
                onClick={() => setSelectedActivity(act)}
                className="flex items-center gap-4 px-5 py-4 hover:bg-white/3 transition-colors group cursor-pointer"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="w-10 h-10 bg-dark-700 rounded-xl flex items-center justify-center text-lg shrink-0">
                  {activityTypeEmoji(act.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{act.title}</p>
                  <p className="text-xs text-neutral-500 flex items-center gap-2">
                    {format(new Date(act.startedAt), "d 'de' MMM yyyy, HH:mm", { locale: pt })}
                    {!act.isManual && <span className="text-[#FC4C02]">• Strava</span>}
                    {act.polyline && <span className="text-brand-500 flex items-center gap-0.5"><MapPin className="w-3 h-3" /> Mapa</span>}
                  </p>
                </div>
                <div className="hidden md:flex items-center gap-5 text-sm shrink-0">
                  <div className="flex items-center gap-1.5 text-neutral-300">
                    <Bike className="w-3.5 h-3.5 text-brand-500" />
                    <span className="font-mono font-semibold">{act.distanceKm.toFixed(1)}</span>
                    <span className="text-neutral-600 text-xs">km</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-neutral-300">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span className="font-mono">{formatDuration(act.durationSeconds)}</span>
                  </div>
                  {act.elevationM && (
                    <div className="hidden lg:flex items-center gap-1.5 text-neutral-300">
                      <Mountain className="w-3.5 h-3.5 text-purple-400" />
                      <span className="font-mono">{act.elevationM}m</span>
                    </div>
                  )}
                  {act.avgWatts && (
                    <div className="hidden lg:flex items-center gap-1.5 text-neutral-300">
                      <Zap className="w-3.5 h-3.5 text-yellow-400" />
                      <span className="font-mono">{act.avgWatts}w</span>
                    </div>
                  )}
                  {act.calories && (
                    <div className="hidden xl:flex items-center gap-1.5 text-neutral-300">
                      <Flame className="w-3.5 h-3.5 text-red-400" />
                      <span className="font-mono">{act.calories}</span>
                      <span className="text-neutral-600 text-xs">kcal</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between animate-fade-up delay-300">
          <p className="text-sm text-neutral-500">Página {page} de {pages}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 rounded-lg bg-dark-800 border border-white/8 flex items-center justify-center text-neutral-400 hover:text-white disabled:opacity-30 transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="w-8 h-8 rounded-lg bg-dark-800 border border-white/8 flex items-center justify-center text-neutral-400 hover:text-white disabled:opacity-30 transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Activity detail modal */}
      {selectedActivity && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedActivity(null)}>
          <div
            className="bg-dark-800 border border-white/10 rounded-2xl w-full max-w-2xl animate-fade-up max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{activityTypeEmoji(selectedActivity.type)}</div>
                <div>
                  <h3 className="font-bold text-white text-lg">{selectedActivity.title}</h3>
                  <p className="text-sm text-neutral-500">
                    {format(new Date(selectedActivity.startedAt), "EEEE, d 'de' MMMM yyyy 'às' HH:mm", { locale: pt })}
                    {!selectedActivity.isManual && <span className="ml-2 text-[#FC4C02]">• Strava</span>}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedActivity(null)} className="text-neutral-500 hover:text-white shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Map */}
            {selectedActivity.polyline && (
              <div className="h-64 w-full">
                <ActivityMap polyline={selectedActivity.polyline} />
              </div>
            )}

            {/* Stats grid */}
            <div className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { icon: Bike, color: "#2B8FBF", label: "Distância", value: `${selectedActivity.distanceKm.toFixed(2)} km` },
                  { icon: Clock, color: "#3AADD4", label: "Duração", value: formatDuration(selectedActivity.durationSeconds) },
                  { icon: Mountain, color: "#8B9FE8", label: "Subida", value: selectedActivity.elevationM ? `${selectedActivity.elevationM} m` : "—" },
                  { icon: Wind, color: "#60cfe8", label: "Vel. Média", value: selectedActivity.avgSpeedKmh ? `${selectedActivity.avgSpeedKmh.toFixed(1)} km/h` : "—" },
                  { icon: Zap, color: "#3AADD4", label: "Avg Watts", value: selectedActivity.avgWatts ? `${selectedActivity.avgWatts} w` : "—" },
                  { icon: Heart, color: "#ed4d99", label: "FC Média", value: selectedActivity.avgHeartRate ? `${Math.round(selectedActivity.avgHeartRate)} bpm` : "—" },
                  { icon: Flame, color: "#E8177A", label: "Calorias", value: selectedActivity.calories ? `${selectedActivity.calories} kcal` : "—" },
                  { icon: MapPin, color: "#2B8FBF", label: "Mapa", value: selectedActivity.polyline ? "Disponível" : "Sem mapa" },
                ].map(({ icon: Icon, color, label, value }) => (
                  <div key={label} className="bg-dark-700 border border-white/5 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
                      <p className="text-xs text-neutral-500">{label}</p>
                    </div>
                    <p className="text-sm font-bold font-mono text-white">{value}</p>
                  </div>
                ))}
              </div>

              {/* Delete button (only manual) */}
              {selectedActivity.isManual && (
                <button
                  onClick={() => handleDelete(selectedActivity.id)}
                  className="w-full py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-sm transition-all"
                >
                  Eliminar atividade
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-800 border border-white/10 rounded-2xl p-6 w-full max-w-lg animate-fade-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-white text-lg">Registar Atividade</h3>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="text-neutral-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

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
                  <button onClick={(e) => { e.stopPropagation(); resetForm(); }} className="ml-auto text-neutral-500 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-2">
                  <div className="w-10 h-10 bg-dark-600 rounded-xl flex items-center justify-center">
                    <Upload className="w-5 h-5 text-neutral-400" />
                  </div>
                  <p className="text-sm text-neutral-400">
                    <span className="text-brand-400 font-medium">Clica</span> ou arrasta um ficheiro{" "}
                    <span className="font-mono text-xs bg-dark-600 px-1.5 py-0.5 rounded">.gpx</span>
                  </p>
                  <p className="text-xs text-neutral-600">Os dados são preenchidos automaticamente</p>
                </div>
              )}
              <input ref={fileRef} type="file" accept=".gpx" className="hidden"
                onChange={(e) => { const file = e.target.files?.[0]; if (file) handleGPX(file); }} />
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">Título *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Volta ao parque" className="w-full bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-brand-500" />
              </div>
              <div>
                <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">Tipo</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[["ride", "🚴", "Bici"], ["run", "🏃", "Corr."], ["walk", "🚶", "Camin."], ["swim", "🏊", "Nat."], ["hike", "🥾", "Trek."]].map(([v, e, l]) => (
                    <button key={v} onClick={() => setForm({ ...form, type: v })}
                      className={cn("flex flex-col items-center gap-1 py-2 rounded-xl border text-xs transition-all",
                        form.type === v ? "border-brand-500/50 bg-brand-500/10 text-brand-300" : "border-white/8 bg-dark-700 text-neutral-500 hover:border-white/15")}>
                      <span>{e}</span><span>{l}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">Data & Hora *</label>
                <input type="datetime-local" value={form.startedAt} onChange={(e) => setForm({ ...form, startedAt: e.target.value })}
                  className="w-full bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 [color-scheme:dark]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">Distância (km) *</label>
                  <input type="number" step="0.1" value={form.distanceKm} onChange={(e) => setForm({ ...form, distanceKm: e.target.value })} placeholder="0.0"
                    className="w-full bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-brand-500" />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">Duração (min) *</label>
                  <input type="number" value={form.durationSeconds} onChange={(e) => setForm({ ...form, durationSeconds: e.target.value })} placeholder="0"
                    className="w-full bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-brand-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { f: "elevationM", label: "Subida (m)" },
                  { f: "avgWatts", label: "Avg Watts" },
                  { f: "avgHeartRate", label: "FC Média" },
                  { f: "calories", label: "Calorias" },
                ].map(({ f, label }) => (
                  <div key={f}>
                    <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">{label}</label>
                    <input type="number" value={form[f as keyof typeof form]} onChange={(e) => setForm({ ...form, [f]: e.target.value })} placeholder="—"
                      className="w-full bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-brand-500" />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowForm(false); resetForm(); }} className="flex-1 py-2.5 rounded-xl bg-dark-700 border border-white/8 text-neutral-400 hover:text-white text-sm transition-all">Cancelar</button>
              <button onClick={handleCreate} disabled={saving || !form.title || !form.distanceKm || !form.durationSeconds}
                className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}