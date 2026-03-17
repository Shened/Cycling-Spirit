import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  metric: z.enum(["distance_km", "elevation_m", "avg_speed", "duration_hours", "activities_count"]),
  eligibleActivityTypes: z.array(z.string()).default(["ride"]),
  startDate: z.string(),
  endDate: z.string(),
  teamId: z.string().optional().nullable(),
  inviteUserIds: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const userId = session.user.id;

  // Busca competições onde o user é criador, membro da equipa ou foi convidado e aceitou
  const competitions = await prisma.competition.findMany({
    where: {
      OR: [
        { createdById: userId },
        {
          team: { members: { some: { userId } } },
          status: "approved",
        },
        {
          team: { members: { some: { userId, role: { in: ["owner", "admin"] } } } },
          status: "pending",
        },
        { invites: { some: { userId, status: "accepted" } } },
      ],
    },
    select: {
      id: true, title: true, description: true, metric: true,
      startDate: true, endDate: true, createdById: true,
      team: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      invites: {
        select: {
          id: true, userId: true, status: true,
          user: { select: { id: true, name: true, avatar: true } },
        },
      },
      entries: {
        select: {
          userId: true, value: true,
          user: { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { value: "desc" },
      },
    },
    orderBy: { startDate: "desc" },
  });

  return NextResponse.json(
    competitions.map((c) => ({
      ...c,
      startDate: c.startDate.toISOString(),
      endDate: c.endDate.toISOString(),
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const { teamId, inviteUserIds, ...rest } = parsed.data;

  // Se for para equipa, verifica membro
  let status: "approved" | "pending" = "approved";

  if (teamId) {
    const member = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: session.user.id } },
    });
    if (!member) return NextResponse.json({ error: "Sem acesso à equipa" }, { status: 403 });

    // Se não for manager/owner, fica pendente
    if (!["owner", "admin"].includes(member.role)) {
      status = "pending";
    }
  }

  const competition = await prisma.competition.create({
    data: {
      ...rest,
      startDate: new Date(rest.startDate),
      endDate: new Date(rest.endDate),
      teamId: teamId ?? null,
      createdById: session.user.id,
      status,
      ...(inviteUserIds && inviteUserIds.length > 0 ? {
        invites: {
          create: inviteUserIds.map((userId) => ({ userId, status: "pending" })),
        },
      } : {}),
    },
  });

  // Se for para equipa, cria entries para todos os membros automaticamente
  if (teamId && status === "approved") {
    const members = await prisma.teamMember.findMany({
      where: { teamId },
      select: { userId: true },
    });
    await prisma.competitionEntry.createMany({
      data: members.map((m) => ({
        competitionId: competition.id,
        userId: m.userId,
        value: 0,
      })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json(
    { ...competition, startDate: competition.startDate.toISOString(), endDate: competition.endDate.toISOString() },
    { status: 201 }
  );
}