// src/app/api/goals/suggestions/route.ts
// Substitui o ficheiro existente

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

const ACTIVITY_GROUPS: Record<string, { label: string; emoji: string; types: string[] }> = {
    cycling: { label: "Ciclismo", emoji: "🚴", types: ["ride", "mountain_bike", "gravel_ride", "e_bike", "virtual_ride"] },
    running: { label: "Corrida", emoji: "🏃", types: ["run", "trail_run"] },
    walking: { label: "Caminhada", emoji: "🚶", types: ["walk", "hike"] },
    swimming: { label: "Natação", emoji: "🏊", types: ["swim"] },
};

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Últimos 3 meses completos
    const months = [1, 2, 3].map((i) => {
        const date = subMonths(now, i);
        return {
            label: date.toLocaleDateString("pt", { month: "long", year: "numeric" }),
            month: date.getMonth() + 1,
            year: date.getFullYear(),
            start: startOfMonth(date),
            end: endOfMonth(date),
        };
    });

    // Objetivos já existentes para não duplicar — usa "all" como default
    const existingGoals = await prisma.goal.findMany({
        where: {
            userId: session.user.id,
            year: currentYear,
            OR: [
                { period: "monthly", month: currentMonth },
                { period: "annual" },
            ],
        },
        select: { metric: true, period: true, activityGroup: true },
    });

    // Verifica se já existe um objetivo para determinada combinação
    const hasGoal = (metric: string, period: string, activityGroup: string) =>
        existingGoals.some(
            (g) =>
                g.metric === metric &&
                g.period === period &&
                (g.activityGroup ?? "all") === activityGroup
        );

    const suggestions: object[] = [];
    const groupStats: Record<string, object[]> = {};

    // Para cada grupo de desporto
    for (const [groupKey, groupConfig] of Object.entries(ACTIVITY_GROUPS)) {
        const monthlyStats = await Promise.all(
            months.map(async (m) => {
                const activities = await prisma.activity.findMany({
                    where: {
                        userId: session.user.id,
                        startedAt: { gte: m.start, lte: m.end },
                        type: { in: groupConfig.types as ("ride" | "mountain_bike" | "gravel_ride" | "e_bike" | "virtual_ride" | "run" | "trail_run" | "walk" | "hike" | "swim")[] },
                    },
                    select: { distanceKm: true, durationSeconds: true },
                });

                return {
                    ...m,
                    distanceKm: activities.reduce((s, a) => s + a.distanceKm, 0),
                    durationHours: activities.reduce((s, a) => s + a.durationSeconds, 0) / 3600,
                    activitiesCount: activities.length,
                    hasData: activities.length > 0,
                };
            })
        );

        const activeMonths = monthlyStats.filter((m) => m.hasData);
        if (activeMonths.length === 0) continue;

        const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
        const round = (v: number, decimals = 1) =>
            Math.round(v * Math.pow(10, decimals)) / Math.pow(10, decimals);

        const avgDistance = avg(activeMonths.map((m) => m.distanceKm));
        const avgDuration = avg(activeMonths.map((m) => m.durationHours));
        const avgActivities = avg(activeMonths.map((m) => m.activitiesCount));
        const BOOST = 1.10;

        groupStats[groupKey] = monthlyStats.map((m) => ({
            label: m.label,
            month: m.month,
            year: m.year,
            distanceKm: round(m.distanceKm),
            durationHours: round(m.durationHours),
            activitiesCount: m.activitiesCount,
        }));

        // Sugestão mensal de distância
        if (!hasGoal("distance_km", "monthly", groupKey) && avgDistance > 0) {
            suggestions.push({
                metric: "distance_km",
                period: "monthly",
                target: round(avgDistance * BOOST),
                year: currentYear,
                month: currentMonth,
                activityGroup: groupKey,
                label: `Distância Mensal — ${groupConfig.emoji} ${groupConfig.label}`,
                reason: `Média dos últimos ${activeMonths.length} meses: ${round(avgDistance)} km`,
                boost: "+10%",
                groupEmoji: groupConfig.emoji,
                groupLabel: groupConfig.label,
            });
        }

        // Sugestão mensal de tempo
        if (!hasGoal("duration_hours", "monthly", groupKey) && avgDuration > 0) {
            suggestions.push({
                metric: "duration_hours",
                period: "monthly",
                target: round(avgDuration * BOOST),
                year: currentYear,
                month: currentMonth,
                activityGroup: groupKey,
                label: `Tempo Mensal — ${groupConfig.emoji} ${groupConfig.label}`,
                reason: `Média dos últimos ${activeMonths.length} meses: ${round(avgDuration)} h`,
                boost: "+10%",
                groupEmoji: groupConfig.emoji,
                groupLabel: groupConfig.label,
            });
        }

        // Sugestão mensal de atividades
        if (!hasGoal("activities_count", "monthly", groupKey) && avgActivities > 0) {
            suggestions.push({
                metric: "activities_count",
                period: "monthly",
                target: Math.max(Math.round(avgActivities * BOOST), 1),
                year: currentYear,
                month: currentMonth,
                activityGroup: groupKey,
                label: `Atividades Mensais — ${groupConfig.emoji} ${groupConfig.label}`,
                reason: `Média dos últimos ${activeMonths.length} meses: ${Math.round(avgActivities)} atividades`,
                boost: "+10%",
                groupEmoji: groupConfig.emoji,
                groupLabel: groupConfig.label,
            });
        }

        // Sugestão anual de distância
        if (!hasGoal("distance_km", "annual", groupKey) && avgDistance > 0) {
            suggestions.push({
                metric: "distance_km",
                period: "annual",
                target: round(avgDistance * 12 * BOOST),
                year: currentYear,
                month: null,
                activityGroup: groupKey,
                label: `Distância Anual — ${groupConfig.emoji} ${groupConfig.label}`,
                reason: `Projeção anual com base nos últimos ${activeMonths.length} meses`,
                boost: "+10%",
                groupEmoji: groupConfig.emoji,
                groupLabel: groupConfig.label,
            });
        }
    }

    return NextResponse.json({ suggestions, groupStats });
}