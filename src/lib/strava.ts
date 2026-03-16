import { prisma } from "@/lib/prisma";

const STRAVA_BASE = "https://www.strava.com/api/v3";

export function getStravaAuthUrl(userId: string) {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: process.env.STRAVA_REDIRECT_URI!,
    response_type: "code",
    approval_prompt: "auto",
    scope: "read,activity:read_all",
    state: userId,
  });
  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeStravaCode(code: string) {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error("Failed to exchange Strava code");
  return res.json();
}

export async function refreshStravaToken(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.stravaRefreshToken) throw new Error("No refresh token");

  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: user.stravaRefreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();

  await prisma.user.update({
    where: { id: userId },
    data: {
      stravaAccessToken: data.access_token,
      stravaRefreshToken: data.refresh_token,
      stravaTokenExpiresAt: new Date(data.expires_at * 1000),
    },
  });

  return data.access_token;
}

export async function getValidStravaToken(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.stravaAccessToken) throw new Error("Not connected to Strava");

  const now = new Date();
  if (user.stravaTokenExpiresAt && user.stravaTokenExpiresAt > now) {
    return user.stravaAccessToken;
  }
  return refreshStravaToken(userId);
}

async function fetchActivityDetail(token: string, activityId: number) {
  const res = await fetch(`${STRAVA_BASE}/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function syncStravaActivities(userId: string) {
  const token = await getValidStravaToken(userId);
  const startOfYear = new Date(new Date().getFullYear(), 0, 1);
  const after = Math.floor(startOfYear.getTime() / 1000);

  // Atividades já na BD com calorias e polyline
  const existingComplete = await prisma.activity.findMany({
    where: { userId, isManual: false, calories: { not: null }, polyline: { not: null } },
    select: { stravaId: true },
  });
  const completeIds = new Set(existingComplete.map((a) => a.stravaId).filter(Boolean));

  // Atividades com calorias mas sem polyline
  const existingWithCalories = await prisma.activity.findMany({
    where: { userId, isManual: false, calories: { not: null } },
    select: { stravaId: true, calories: true },
  });
  const caloriesMap = new Map(existingWithCalories.map((a) => [a.stravaId, a.calories]));

  let page = 1;
  let synced = 0;
  const perPage = 100;

  while (true) {
    const res = await fetch(
      `${STRAVA_BASE}/athlete/activities?after=${after}&per_page=${perPage}&page=${page}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const activities = await res.json();
    if (!Array.isArray(activities) || activities.length === 0) break;

    for (const act of activities) {
      const type = mapStravaType(act.type);
      const stravaId = String(act.id);

      let calories: number | null = null;
      let polyline: string | null = null;

      if (!completeIds.has(stravaId)) {
        // Busca detalhes completos (calorias + polyline)
        const detail = await fetchActivityDetail(token, act.id);
        calories = detail?.calories || null;
        polyline = detail?.map?.polyline || detail?.map?.summary_polyline || null;
      } else {
        // Já tem tudo — mantém valores existentes
        calories = caloriesMap.get(stravaId) ?? null;
        const existing = await prisma.activity.findUnique({
          where: { stravaId },
          select: { polyline: true },
        });
        polyline = existing?.polyline ?? null;
      }

      await prisma.activity.upsert({
        where: { stravaId },
        create: {
          userId,
          stravaId,
          title: act.name,
          type,
          distanceKm: (act.distance || 0) / 1000,
          durationSeconds: act.moving_time || 0,
          elevationM: act.total_elevation_gain ? Math.round(act.total_elevation_gain) : null,
          avgWatts: act.average_watts ? Math.round(act.average_watts) : null,
          avgHeartRate: act.average_heartrate || null,
          avgSpeedKmh: act.average_speed ? act.average_speed * 3.6 : null,
          calories,
          polyline,
          startedAt: new Date(act.start_date),
          isManual: false,
        },
        update: {
          title: act.name,
          distanceKm: (act.distance || 0) / 1000,
          durationSeconds: act.moving_time || 0,
          elevationM: act.total_elevation_gain ? Math.round(act.total_elevation_gain) : null,
          avgWatts: act.average_watts ? Math.round(act.average_watts) : null,
          avgHeartRate: act.average_heartrate || null,
          avgSpeedKmh: act.average_speed ? act.average_speed * 3.6 : null,
          calories,
          polyline,
        },
      });
      synced++;
    }

    if (activities.length < perPage) break;
    page++;
  }

  return synced;
}

function mapStravaType(stravaType: string): "ride" | "run" | "walk" | "swim" | "hike" {
  const map: Record<string, "ride" | "run" | "walk" | "swim" | "hike"> = {
    Ride: "ride",
    VirtualRide: "ride",
    Run: "run",
    Walk: "walk",
    Swim: "swim",
    Hike: "hike",
  };
  return map[stravaType] ?? "ride";
}

export async function getSegmentEffortsForParticipants(
  participants: { userId: string }[],
  segmentId: string,
  stageDate: Date
): Promise<{ userId: string; finishTime: Date; elapsedSeconds: number }[]> {
  const startOfDay = new Date(stageDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(stageDate);
  endOfDay.setHours(23, 59, 59, 999);

  const results: { userId: string; finishTime: Date; elapsedSeconds: number }[] = [];

  for (const participant of participants) {
    try {
      const token = await getValidStravaToken(participant.userId);

      const res = await fetch(
        `${STRAVA_BASE}/segment_efforts?segment_id=${segmentId}&start_date_local=${startOfDay.toISOString()}&end_date_local=${endOfDay.toISOString()}&per_page=1`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) continue;
      const efforts = await res.json();
      if (!Array.isArray(efforts) || efforts.length === 0) continue;

      // Melhor esforço do dia (mais rápido a chegar)
      const effort = efforts[0];
      const startTime = new Date(effort.start_date);
      const elapsedSeconds = effort.elapsed_time;
      const finishTime = new Date(startTime.getTime() + elapsedSeconds * 1000);

      results.push({ userId: participant.userId, finishTime, elapsedSeconds });
    } catch {
      // Participante sem Strava ligado ou sem esforço — ignora
      continue;
    }
  }

  // Ordena por hora de chegada (quem terminou o segment primeiro)
  return results.sort((a, b) => a.finishTime.getTime() - b.finishTime.getTime());
}