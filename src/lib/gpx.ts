export interface GPXData {
    title: string;
    distanceKm: number;
    durationSeconds: number;
    elevationM: number;
    avgSpeedKmh: number;
    startedAt: string;
    points: { lat: number; lon: number; ele: number; time: string }[];
}

export function parseGPX(xmlString: string): GPXData {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, "application/xml");

    // Title
    const nameEl = doc.querySelector("trk > name") ?? doc.querySelector("metadata > name");
    const title = nameEl?.textContent?.trim() ?? "Atividade GPX";

    // Track points
    const trkpts = Array.from(doc.querySelectorAll("trkpt"));
    if (trkpts.length === 0) throw new Error("Ficheiro GPX sem pontos de rota.");

    const points = trkpts.map((pt) => ({
        lat: parseFloat(pt.getAttribute("lat") ?? "0"),
        lon: parseFloat(pt.getAttribute("lon") ?? "0"),
        ele: parseFloat(pt.querySelector("ele")?.textContent ?? "0"),
        time: pt.querySelector("time")?.textContent ?? "",
    }));

    // Distance (Haversine)
    let distanceKm = 0;
    for (let i = 1; i < points.length; i++) {
        distanceKm += haversine(points[i - 1], points[i]);
    }

    // Duration
    const firstTime = points.find((p) => p.time)?.time;
    const lastTime = [...points].reverse().find((p) => p.time)?.time;
    let durationSeconds = 0;
    let startedAt = new Date().toISOString();
    if (firstTime && lastTime) {
        const start = new Date(firstTime);
        const end = new Date(lastTime);
        durationSeconds = Math.round((end.getTime() - start.getTime()) / 1000);
        startedAt = start.toISOString();
    }

    // Elevation gain
    let elevationM = 0;
    for (let i = 1; i < points.length; i++) {
        const diff = points[i].ele - points[i - 1].ele;
        if (diff > 0) elevationM += diff;
    }

    // Avg speed
    const avgSpeedKmh = durationSeconds > 0
        ? Math.round((distanceKm / (durationSeconds / 3600)) * 10) / 10
        : 0;

    return {
        title,
        distanceKm: Math.round(distanceKm * 100) / 100,
        durationSeconds,
        elevationM: Math.round(elevationM),
        avgSpeedKmh,
        startedAt,
        points,
    };
}

function haversine(
    a: { lat: number; lon: number },
    b: { lat: number; lon: number }
): number {
    const R = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const x =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function toRad(deg: number) {
    return (deg * Math.PI) / 180;
}