// src/app/api/strava/auto-sync/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncStravaActivities, syncStravaKoms, syncPersonalRecords } from "@/lib/strava";

export async function POST() {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ skip: true });

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { stravaId: true, lastSyncAt: true },
    });

    if (!user?.stravaId) return NextResponse.json({ skip: true });

    // Verifica se já sincronizou hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (user.lastSyncAt && user.lastSyncAt >= today) {
        return NextResponse.json({ skip: true, reason: "already synced today" });
    }

    // Sincroniza e regista o timestamp
    const [activities, koms] = await Promise.all([
        syncStravaActivities(session.user.id),
        syncStravaKoms(session.user.id),
    ]);
    await syncPersonalRecords(session.user.id);
    await prisma.user.update({
        where: { id: session.user.id },
        data: { lastSyncAt: new Date() },
    });

    return NextResponse.json({ synced: true, activities, koms });
}