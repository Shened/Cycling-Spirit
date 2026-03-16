import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  type: z.enum(["ride", "run", "walk", "swim", "hike"]).default("ride"),
  targetDistanceKm: z.number().min(0).optional().nullable(),
  targetDurationMin: z.number().int().min(0).optional().nullable(),
  targetWatts: z.number().int().min(0).optional().nullable(),
  scheduledFor: z.string(),
  teamId: z.string().optional().nullable(),
  isTeamShared: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const dateFilter = {
    ...(from ? { gte: new Date(from) } : {}),
    ...(to ? { lte: new Date(to) } : {}),
  };

  let where: Record<string, unknown>;

  if (teamId) {
    const member = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: session.user.id } },
    });
    if (!member) return NextResponse.json({ error: "Sem acesso" }, { status: 403 });

    where = {
      teamId,
      isTeamShared: true,
      ...(Object.keys(dateFilter).length ? { scheduledFor: dateFilter } : {}),
    };
  } else {
    where = {
      userId: session.user.id,
      ...(Object.keys(dateFilter).length ? { scheduledFor: dateFilter } : {}),
    };
  }

  const planned = await prisma.plannedActivity.findMany({
    where,
    select: {
      id: true, userId: true, teamId: true, title: true, description: true,
      type: true, targetDistanceKm: true, targetDurationMin: true, targetWatts: true,
      scheduledFor: true, isTeamShared: true, completed: true,
      user: { select: { id: true, name: true, avatar: true } },
      team: { select: { id: true, name: true } },
    },
    orderBy: { scheduledFor: "asc" },
  });

  return NextResponse.json(
    planned.map((p) => ({ ...p, scheduledFor: p.scheduledFor.toISOString() }))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });

  const { teamId, isTeamShared, ...rest } = parsed.data;

  if (teamId) {
    const member = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: session.user.id } },
    });
    if (!member) return NextResponse.json({ error: "Sem acesso à equipa" }, { status: 403 });
  }

  const planned = await prisma.plannedActivity.create({
    data: {
      ...rest,
      scheduledFor: new Date(rest.scheduledFor),
      userId: session.user.id,
      teamId: teamId ?? null,
      isTeamShared: teamId ? isTeamShared : false,
    },
    select: {
      id: true, userId: true, teamId: true, title: true, description: true,
      type: true, targetDistanceKm: true, targetDurationMin: true, targetWatts: true,
      scheduledFor: true, isTeamShared: true, completed: true,
      user: { select: { id: true, name: true, avatar: true } },
      team: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ ...planned, scheduledFor: planned.scheduledFor.toISOString() }, { status: 201 });
}
