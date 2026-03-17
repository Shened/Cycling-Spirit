import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id } = await params;

    const competition = await prisma.competition.findUnique({
        where: { id },
        select: {
            id: true, metric: true, startDate: true, endDate: true,
            eligibleActivityTypes: true,
            entries: { select: { id: true, userId: true } },
        },
    });

    if (!competition) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    const { metric, startDate, endDate, entries, eligibleActivityTypes } = competition;

    for (const entry of entries) {
        const activities = await prisma.activity.findMany({
            where: {
                userId: entry.userId,
                startedAt: { gte: startDate, lte: endDate },
                ...(eligibleActivityTypes.length > 0 ? {
                    type: { in: eligibleActivityTypes as ("ride" | "mountain_bike" | "gravel_ride" | "e_bike" | "virtual_ride" | "run" | "trail_run" | "walk" | "hike" | "swim")[] },
                } : {}),
            },
        });

        let value = 0;
        switch (metric) {
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

    return NextResponse.json({ message: "Valores atualizados", entries: entries.length });
}