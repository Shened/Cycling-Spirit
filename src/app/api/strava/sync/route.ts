// src/app/api/strava/auto-sync/route.ts
// Substitui o ficheiro existente — adiciona sync de competições

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncStravaActivities, syncStravaKoms, syncPersonalRecords } from "@/lib/strava";
import { syncActiveCompetitionsForUser } from "@/lib/competitions";

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
    return NextResponse.json({ skip: true, reason: "already_synced_today" });
  }

  try {
    // 1. Sync atividades + KOMs + records
    const [activities, koms] = await Promise.all([
      syncStravaActivities(session.user.id),
      syncStravaKoms(session.user.id),
    ]);
    await syncPersonalRecords(session.user.id);

    // 2. Atualiza competições ativas
    const competitionsSynced = await syncActiveCompetitionsForUser(session.user.id);

    // 3. Regista timestamp
    await prisma.user.update({
      where: { id: session.user.id },
      data: { lastSyncAt: new Date() },
    });

    return NextResponse.json({ synced: true, activities, koms, competitionsSynced });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[auto-sync] Erro:", msg);
    return NextResponse.json({ skip: true, error: msg });
  }
}