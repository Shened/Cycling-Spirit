import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1).max(255),
  type: z.enum(["ride", "run", "walk", "swim", "hike"]),
  distanceKm: z.number().min(0),
  durationSeconds: z.number().int().min(0),
  elevationM: z.number().int().min(0).optional().nullable(),
  avgWatts: z.number().int().min(0).optional().nullable(),
  avgHeartRate: z.number().min(0).optional().nullable(),
  avgSpeedKmh: z.number().min(0).optional().nullable(),
  calories: z.number().int().min(0).optional().nullable(),
  polyline: z.string().optional().nullable(),
  startedAt: z.string(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const type = searchParams.get("type");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where = {
    userId: session.user.id,
    ...(type ? { type: type as "ride" | "mountain_bike" | "gravel_ride" | "e_bike" | "virtual_ride" | "run" | "trail_run" | "walk" | "hike" | "swim" } : {}),
    ...(from || to ? {
      startedAt: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      }
    } : {}),
  };

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      orderBy: { startedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.activity.count({ where }),
  ]);

  return NextResponse.json({
    activities: activities.map((a) => ({ ...a, startedAt: a.startedAt.toISOString() })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });

  const activity = await prisma.activity.create({
    data: {
      ...parsed.data,
      userId: session.user.id,
      startedAt: new Date(parsed.data.startedAt),
      isManual: true,
    },
  });

  return NextResponse.json({ ...activity, startedAt: activity.startedAt.toISOString() }, { status: 201 });
}