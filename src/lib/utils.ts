export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatDistance(km: number): string {
  return km >= 1000
    ? `${(km / 1000).toFixed(1)}k km`
    : `${km.toFixed(1)} km`;
}

export function formatPace(km: number, seconds: number): string {
  if (km === 0) return "—";
  const secPerKm = seconds / km;
  const m = Math.floor(secPerKm / 60);
  const s = Math.floor(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")} /km`;
}

export function activityTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    ride: "Ciclismo",
    run: "Corrida",
    walk: "Caminhada",
    swim: "Natação",
    hike: "Trekking",
  };
  return labels[type] ?? type;
}

export function activityTypeEmoji(type: string): string {
  const e: Record<string, string> = {
    ride: "🚴",
    run: "🏃",
    walk: "🚶",
    swim: "🏊",
    hike: "🥾",
  };
  return e[type] ?? "🏅";
}

export function metricLabel(metric: string): string {
  const labels: Record<string, string> = {
    distance_km: "Distância (km)",
    elevation_m: "Subida (m)",
    avg_speed: "Velocidade média (km/h)",
    duration_hours: "Tempo (horas)",
    activities_count: "Nº de atividades",
  };
  return labels[metric] ?? metric;
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
