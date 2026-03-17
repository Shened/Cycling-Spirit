"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, User, Zap, Activity, Check, Unlink, Bike, Mountain, PersonStanding, Footprints, Waves, Monitor, Eye, EyeOff } from "lucide-react";
import { activityTypeLabel, activityTypeIcon, cn } from "@/lib/utils";

const ACTIVITY_TYPES = [
  "ride", "mountain_bike", "gravel_ride", "e_bike", "virtual_ride",
  "run", "trail_run", "walk", "hike", "swim"
];

interface Props {
  user: {
    id: string; name: string; email: string; avatar?: string | null;
    ftpWatts?: number | null; weightKg?: number | null; stravaId?: string | null;
    defaultActivityType?: string | null; isPublic?: boolean | null;
  };
}

export default function SettingsClient({ user }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: user.name,
    ftpWatts: user.ftpWatts?.toString() ?? "",
    weightKg: user.weightKg?.toString() ?? "",
    defaultActivityType: user.defaultActivityType ?? "ride",
    isPublic: user.isPublic ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        ftpWatts: form.ftpWatts ? parseInt(form.ftpWatts) : null,
        weightKg: form.weightKg ? parseFloat(form.weightKg) : null,
        defaultActivityType: form.defaultActivityType,
        isPublic: form.isPublic,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      router.refresh();
    }
  };

  const handleStravaSync = async () => {
    setSyncing(true);
    const res = await fetch("/api/strava/sync", { method: "POST" });
    const data = await res.json();
    setSyncing(false);
    alert(data.message ?? data.error);
  };

  const handleStravaDisconnect = async () => {
    if (!confirm("Desligar o Strava? As atividades importadas não serão eliminadas.")) return;
    await fetch("/api/strava/disconnect", { method: "DELETE" });
    router.refresh();
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="animate-fade-up">
        <h1 className="font-display text-3xl text-white tracking-wide">DEFINIÇÕES</h1>
        <p className="text-neutral-500 text-sm mt-0.5">Gere o teu perfil e integrações</p>
      </div>

      {/* Profile */}
      <div className="animate-fade-up delay-100 bg-dark-800 border border-white/5 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 bg-brand-500/15 rounded-xl flex items-center justify-center">
            <User className="w-4 h-4 text-brand-400" />
          </div>
          <h2 className="font-semibold text-white">Perfil</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">Nome</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">Email</label>
            <input
              value={user.email}
              disabled
              className="w-full bg-dark-700/50 border border-white/5 rounded-xl px-3 py-2.5 text-sm text-neutral-500 cursor-not-allowed"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-yellow-400" /> FTP (watts)
              </label>
              <input
                type="number"
                value={form.ftpWatts}
                onChange={(e) => setForm({ ...form, ftpWatts: e.target.value })}
                placeholder="Ex: 250"
                className="w-full bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-brand-500 transition-colors"
              />
              <p className="text-xs text-neutral-600 mt-1">Usado para calcular zonas de treino</p>
            </div>
            <div>
              <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">Peso (kg)</label>
              <input
                type="number"
                step="0.1"
                value={form.weightKg}
                onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
                placeholder="Ex: 70"
                className="w-full bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
          </div>

          {/* Visibilidade do perfil */}
          <div>
            <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">
              Visibilidade do Perfil
            </label>
            <button
              type="button"
              onClick={() => setForm({ ...form, isPublic: !form.isPublic })}
              className={cn(
                "w-full flex items-center justify-between p-3 rounded-xl border transition-all",
                form.isPublic
                  ? "border-brand-500/40 bg-brand-500/10"
                  : "border-white/8 bg-dark-700"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  form.isPublic ? "bg-brand-500/20" : "bg-dark-600"
                )}>
                  {form.isPublic
                    ? <Eye className="w-4 h-4 text-brand-400" />
                    : <EyeOff className="w-4 h-4 text-neutral-500" />
                  }
                </div>
                <div className="text-left">
                  <p className={cn("text-sm font-medium", form.isPublic ? "text-white" : "text-neutral-400")}>
                    {form.isPublic ? "Perfil Público" : "Perfil Privado"}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {form.isPublic
                      ? "Qualquer utilizador pode ver o teu perfil"
                      : "Só os teus amigos podem ver o teu perfil"}
                  </p>
                </div>
              </div>
              <div className={cn(
                "w-10 h-6 rounded-full transition-all relative shrink-0",
                form.isPublic ? "bg-brand-500" : "bg-dark-600 border border-white/15"
              )}>
                <div className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all",
                  form.isPublic ? "left-5" : "left-1"
                )} />
              </div>
            </button>
          </div>

          {/* Default activity type */}
          <div>
            <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">
              Desporto Principal
            </label>
            <p className="text-xs text-neutral-600 mb-3">Filtro aplicado por defeito no dashboard</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ACTIVITY_TYPES.map((type) => {
                const Icon = activityTypeIcon(type);
                const active = form.defaultActivityType === type;
                return (
                  <button
                    key={type}
                    onClick={() => setForm({ ...form, defaultActivityType: type })}
                    className={cn(
                      "flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all",
                      active
                        ? "border-brand-500/40 bg-brand-500/10 text-white"
                        : "border-white/8 bg-dark-700 text-neutral-500 hover:border-white/15 hover:text-neutral-300"
                    )}
                  >
                    <Icon className={cn("w-4 h-4 shrink-0", active ? "text-brand-400" : "")} />
                    <span className="text-xs font-medium truncate">{activityTypeLabel(type)}</span>
                    {active && <Check className="w-3.5 h-3.5 ml-auto text-brand-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
            {saved ? "Guardado!" : saving ? "A guardar..." : "Guardar"}
          </button>
        </div>
      </div>

      {/* Strava */}
      <div className="animate-fade-up delay-200 bg-dark-800 border border-white/5 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 bg-[#FC4C02]/15 rounded-xl flex items-center justify-center">
            <Activity className="w-4 h-4 text-[#FC4C02]" />
          </div>
          <h2 className="font-semibold text-white">Strava</h2>
          {user.stravaId && (
            <span className="text-xs bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
              Ligado
            </span>
          )}
        </div>

        {user.stravaId ? (
          <div className="space-y-3">
            <p className="text-sm text-neutral-400">
              A tua conta Strava está ligada. As atividades são importadas automaticamente desde o início do ano.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleStravaSync}
                disabled={syncing}
                className="flex items-center justify-center gap-2 bg-[#FC4C02]/10 border border-[#FC4C02]/25 text-[#FC4C02] hover:bg-[#FC4C02]/20 text-sm font-medium px-4 py-2.5 rounded-xl transition-all disabled:opacity-50"
              >
                {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                {syncing ? "A sincronizar..." : "Sincronizar agora"}
              </button>
              <button
                onClick={handleStravaDisconnect}
                className="flex items-center justify-center gap-2 bg-dark-700 border border-white/8 text-neutral-400 hover:text-red-400 hover:border-red-500/20 text-sm px-4 py-2.5 rounded-xl transition-all"
              >
                <Unlink className="w-4 h-4" /> Desligar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-neutral-400">
              Liga o teu Strava para importar automaticamente as atividades desde o início do ano.
            </p>
            <a
              href="/api/strava/connect"
              className="inline-flex items-center gap-2 bg-[#FC4C02] hover:bg-[#e04400] text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-all"
            >
              <Activity className="w-4 h-4" />
              Ligar com Strava
            </a>
          </div>
        )}
      </div>
    </div >
  );
}