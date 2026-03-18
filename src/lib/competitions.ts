// src/lib/competitions.ts
// Utilitário reutilizável — usado no webhook e no auto-sync

import { prisma } from "@/lib/prisma";

export async function syncActiveCompetitionsForUser(userId: string) {
    const now = new Date();

    // Busca competições ativas onde o user tem entry
    const competitions = await prisma.competition.findMany({
        where: {
            status: "approved",
            startDate: { lte: now },
            endDate: { gte: now },
            entries: { some: { userId } },
        },
        select: {
            id: true,
            metric: true,
            startDate: true,
            endDate: true,
            eligibleActivityTypes: true,
            entries: {
                where: { userId },
                select: { id: true },
            },
        },
    });

    if (competitions.length === 0) return 0;

    for (const comp of competitions) {
        const entry = comp.entries[0];
        if (!entry) continue;

        const activities = await prisma.activity.findMany({
            where: {
                userId,
                startedAt: { gte: comp.startDate, lte: comp.endDate },
                ...(comp.eligibleActivityTypes.length > 0
                    ? { type: { in: comp.eligibleActivityTypes as ("ride" | "mountain_bike" | "gravel_ride" | "e_bike" | "virtual_ride" | "run" | "trail_run" | "walk" | "hike" | "swim")[] } }
                    : {}),
            },
        });

        let value = 0;
        switch (comp.metric) {
            case "distance_km":
                value = activities.reduce((s, a) => s + a.distanceKm, 0);
                break;
            case "elevation_m":
                value = activities.reduce((s, a) => s + (a.elevationM ?? 0), 0);
                break;
            case "avg_speed": {
                const withSpeed = activities.filter((a) => a.avgSpeedKmh);
                value = withSpeed.length > 0
                    ? withSpeed.reduce((s, a) => s + (a.avgSpeedKmh ?? 0), 0) / withSpeed.length
                    : 0;
                break;
            }
            case "duration_hours":
                value = activities.reduce((s, a) => s + a.durationSeconds, 0) / 3600;
                break;
            case "activities_count":
                value = activities.length;
                break;
        }

        await prisma.competitionEntry.update({
            where: { id: entry.id },
            data: { value: Math.round(value * 100) / 100 },
        });
    }

    console.log(`[competitions] Synced ${competitions.length} competition(s) for user ${userId}`);
    return competitions.length;
}