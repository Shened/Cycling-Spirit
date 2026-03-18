// src/app/api/strava/sync-history/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getValidStravaToken, syncPersonalRecords } from "@/lib/strava";

const STRAVA_BASE = "https://www.strava.com/api/v3";

async function fetchActivityDetail(token: string, activityId: number) {
    const res = await fetch(`${STRAVA_BASE}/activities/${activityId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
}

function mapStravaType(stravaType: string): "ride" | "mountain_bike" | "gravel_ride" | "e_bike" | "virtual_ride" | "run" | "trail_run" | "walk" | "hike" | "swim" {
    const map: Record<string, "ride" | "mountain_bike" | "gravel_ride" | "e_bike" | "virtual_ride" | "run" | "trail_run" | "walk" | "hike" | "swim"> = {
        Ride: "ride", VirtualRide: "virtual_ride", EBikeRide: "e_bike",
        MountainBikeRide: "mountain_bike", GravelRide: "gravel_ride",
        Run: "run", TrailRun: "trail_run",
        Walk: "walk", Hike: "hike", Swim: "swim",
    };
    return map[stravaType] ?? "ride";
}

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const { sinceYear } = body;

    if (!sinceYear || sinceYear < 2010 || sinceYear > new Date().getFullYear()) {
        return NextResponse.json({ error: "Ano inválido" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { stravaId: true },
    });

    if (!user?.stravaId) {
        return NextResponse.json({ error: "Strava não ligado" }, { status: 400 });
    }

    const token = await getValidStravaToken(session.user.id);
    const after = Math.floor(new Date(sinceYear, 0, 1).getTime() / 1000);

    // Atividades já na BD para evitar re-fetch desnecessário
    const existingComplete = await prisma.activity.findMany({
        where: { userId: session.user.id, isManual: false, calories: { not: null }, polyline: { not: null } },
        select: { stravaId: true },
    });
    const completeIds = new Set(existingComplete.map((a) => a.stravaId).filter(Boolean));

    let page = 1;
    let synced = 0;
    const perPage = 100;

    while (true) {
        const res = await fetch(
            `${STRAVA_BASE}/athlete/activities?after=${after}&per_page=${perPage}&page=${page}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!res.ok) break;
        const activities = await res.json();
        if (!Array.isArray(activities) || activities.length === 0) break;

        for (const act of activities) {
            const type = mapStravaType(act.type);
            const stravaId = String(act.id);

            let calories: number | null = null;
            let polyline: string | null = null;

            if (!completeIds.has(stravaId)) {
                const detail = await fetchActivityDetail(token, act.id);
                calories = detail?.calories || null;
                polyline = detail?.map?.polyline || detail?.map?.summary_polyline || null;
            } else {
                const existing = await prisma.activity.findUnique({
                    where: { stravaId },
                    select: { calories: true, polyline: true },
                });
                calories = existing?.calories ?? null;
                polyline = existing?.polyline ?? null;
            }

            await prisma.activity.upsert({
                where: { stravaId },
                create: {
                    userId: session.user.id, stravaId, title: act.name, type,
                    distanceKm: (act.distance || 0) / 1000,
                    durationSeconds: act.moving_time || 0,
                    elevationM: act.total_elevation_gain ? Math.round(act.total_elevation_gain) : null,
                    avgWatts: act.average_watts ? Math.round(act.average_watts) : null,
                    avgHeartRate: act.average_heartrate || null,
                    avgSpeedKmh: act.average_speed ? act.average_speed * 3.6 : null,
                    calories, polyline,
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
                    calories, polyline,
                },
            });
            synced++;
        }

        if (activities.length < perPage) break;
        page++;
    }

    await syncPersonalRecords(session.user.id);

    return NextResponse.json({
        message: `${synced} atividades sincronizadas desde ${sinceYear}`,
        synced,
    });
}