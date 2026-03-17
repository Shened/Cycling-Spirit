import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  startOfMonth, endOfMonth,
  startOfWeek, endOfWeek,
  subWeeks, startOfYear, endOfYear,
} from "date-fns";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get("userId") ?? session.user.id;
  const teamId = searchParams.get("teamId");
  const period = searchParams.get("period") ?? "month";
  const activityType = searchParams.get("type"); // novo filtro

  if (targetUserId !== session.user.id) {
    const shared = await prisma.teamMember.findFirst({
      where: {
        userId: session.user.id,
        team: { members: { some: { userId: targetUserId } } },
      },
    });
    if (!shared) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const now = new Date();

  let periodStart: Date;
  let periodEnd: Date;

  if (period === "week") {
    periodStart = startOfWeek(now, { weekStartsOn: 1 });
    periodEnd = endOfWeek(now, { weekStartsOn: 1 });
  } else if (period === "year") {
    periodStart = startOfYear(now);
    periodEnd = endOfYear(now);
  } else {
    periodStart = startOfMonth(now);
    periodEnd = endOfMonth(now);
  }

  // Filtro base
  const baseFilter = {
    ...(activityType ? { type: activityType as "ride" | "run" | "walk" | "swim" | "hike" } : {}),
  };

  let activitiesQuery: Record<string, unknown> = { userId: targetUserId, ...baseFilter };
  if (teamId) {
    activitiesQuery = { user: { teamMemberships: { some: { teamId } } }, ...baseFilter };
  }

  const periodActivities = await prisma.activity.findMany({
    where: { ...activitiesQuery, startedAt: { gte: periodStart, lte: periodEnd } },
  });

  const recentActivities = await prisma.activity.findMany({
    where: activitiesQuery,
    orderBy: { startedAt: "desc" },
    take: 5,
  });

  const weeklyKm = await Promise.all(
    Array.from({ length: 8 }, (_, i) => {
      const weekStart = startOfWeek(subWeeks(now, 7 - i), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(subWeeks(now, 7 - i), { weekStartsOn: 1 });
      return prisma.activity.aggregate({
        where: { ...activitiesQuery, startedAt: { gte: weekStart, lte: weekEnd } },
        _sum: { distanceKm: true },
      }).then((r) => ({
        week: weekStart.toLocaleDateString("pt", { day: "2-digit", month: "short" }),
        km: Math.round((r._sum.distanceKm ?? 0) * 10) / 10,
      }));
    })
  );

  const stats = {
    totalKm: Math.round(periodActivities.reduce((s, a) => s + a.distanceKm, 0) * 10) / 10,
    totalHours: Math.round((periodActivities.reduce((s, a) => s + a.durationSeconds, 0) / 3600) * 10) / 10,
    totalCalories: periodActivities.reduce((s, a) => s + (a.calories ?? 0), 0),
    totalActivities: periodActivities.length,
    totalElevation: periodActivities.reduce((s, a) => s + (a.elevationM ?? 0), 0),
    avgWatts: Math.round(
      periodActivities.filter((a) => a.avgWatts).reduce((s, a) => s + (a.avgWatts ?? 0), 0) /
      (periodActivities.filter((a) => a.avgWatts).length || 1)
    ),
    avgSpeed: Math.round(
      (periodActivities.filter((a) => a.avgSpeedKmh).reduce((s, a) => s + (a.avgSpeedKmh ?? 0), 0) /
        (periodActivities.filter((a) => a.avgSpeedKmh).length || 1)) * 10
    ) / 10,
    avgHeartRate: Math.round(
      periodActivities.filter((a) => a.avgHeartRate).reduce((s, a) => s + (a.avgHeartRate ?? 0), 0) /
      (periodActivities.filter((a) => a.avgHeartRate).length || 1)
    ),
    weeklyKm,
    recentActivities: recentActivities.map((a) => ({ ...a, startedAt: a.startedAt.toISOString() })),
    monthlyActivities: periodActivities.map((a) => ({ ...a, startedAt: a.startedAt.toISOString() })),
  };

  // Competições ativas
  const now2 = new Date();
  const activeCompetitions = await prisma.competition.findMany({
    where: {
      status: "approved",
      startDate: { lte: now2 },
      endDate: { gte: now2 },
      OR: [
        { team: { members: { some: { userId: targetUserId } } } },
        { invites: { some: { userId: targetUserId, status: "accepted" } } },
        { createdById: targetUserId },
      ],
    },
    select: {
      id: true, title: true, metric: true, endDate: true,
      entries: {
        select: { userId: true, value: true, user: { select: { id: true, name: true } } },
        orderBy: { value: "desc" },
        take: 3,
      },
    },
    take: 3,
  });

  return NextResponse.json({
    ...stats,
    activeCompetitions: activeCompetitions.map((c) => ({
      ...c,
      endDate: c.endDate.toISOString(),
    })),
  });
}