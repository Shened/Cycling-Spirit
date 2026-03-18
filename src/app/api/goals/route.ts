// src/app/api/goals/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ACTIVITY_GROUPS: Record<string, string[]> = {
    cycling: ["ride", "mountain_bike", "gravel_ride", "e_bike", "virtual_ride"],
    running: ["run", "trail_run"],
    walking: ["walk", "hike"],
    swimming: ["swim"],
};

const schema = z.object({
    metric: z.enum(["distance_km", "duration_hours", "activities_count"]),
    period: z.enum(["monthly", "annual"]),
    target: z.number().min(1),
    year: z.number().int(),
    month: z.number().int().min(1).max(12).optional().nullable(),
    activityGroup: z.enum(["all", "cycling", "running", "walking", "swimming"]).default("all"),
});

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));

    const goals = await prisma.goal.findMany({
        where: { userId: session.user.id, year },
        orderBy: [{ period: "asc" }, { month: "asc" }, { metric: "asc" }],
    });

    const now = new Date();

    const goalsWithProgress = await Promise.all(
        goals.map(async (goal) => {
            let startDate: Date;
            let endDate: Date;

            if (goal.period === "annual") {
                startDate = new Date(goal.year, 0, 1);
                endDate = new Date(goal.year, 11, 31, 23, 59, 59);
            } else {
                const month = goal.month! - 1;
                startDate = new Date(goal.year, month, 1);
                endDate = new Date(goal.year, month + 1, 0, 23, 59, 59);
            }

            const group = goal.activityGroup ?? "all";
            const typeFilter = group !== "all" && ACTIVITY_GROUPS[group]
                ? { type: { in: ACTIVITY_GROUPS[group] as ("ride" | "mountain_bike" | "gravel_ride" | "e_bike" | "virtual_ride" | "run" | "trail_run" | "walk" | "hike" | "swim")[] } }
                : {};

            const activities = await prisma.activity.findMany({
                where: {
                    userId: session.user.id,
                    startedAt: { gte: startDate, lte: endDate },
                    ...typeFilter,
                },
                select: { distanceKm: true, durationSeconds: true },
            });

            let current = 0;
            switch (goal.metric) {
                case "distance_km":
                    current = activities.reduce((s, a) => s + a.distanceKm, 0);
                    break;
                case "duration_hours":
                    current = activities.reduce((s, a) => s + a.durationSeconds, 0) / 3600;
                    break;
                case "activities_count":
                    current = activities.length;
                    break;
            }

            const pct = Math.min(Math.round((current / goal.target) * 100), 100);
            const isActive = now >= startDate && now <= endDate;

            return {
                ...goal,
                activityGroup: group,
                current: Math.round(current * 10) / 10,
                pct,
                isActive,
            };
        })
    );

    return NextResponse.json(goalsWithProgress);
}

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });

    const { metric, period, target, year, month, activityGroup } = parsed.data;
    const finalMonth = period === "annual" ? null : (month ?? new Date().getMonth() + 1);
    const finalGroup = activityGroup ?? "all";

    const goal = await prisma.goal.upsert({
        where: {
            userId_metric_period_year_month_activityGroup: {
                userId: session.user.id,
                metric,
                period,
                year,
                month: finalMonth ?? 0,
                activityGroup: finalGroup,
            },
        },
        create: {
            userId: session.user.id,
            metric,
            period,
            target,
            year,
            month: finalMonth,
            activityGroup: finalGroup,
        },
        update: { target },
    });

    return NextResponse.json(goal, { status: 201 });
}

export async function DELETE(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

    const goal = await prisma.goal.findUnique({ where: { id } });
    if (!goal || goal.userId !== session.user.id) {
        return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }

    await prisma.goal.delete({ where: { id } });
    return NextResponse.json({ message: "Eliminado" });
}