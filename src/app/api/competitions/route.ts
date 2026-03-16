import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  teamId: z.string(),
  title: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  metric: z.enum(["distance_km", "elevation_m", "avg_speed", "duration_hours", "activities_count"]),
  startDate: z.string(),
  endDate: z.string(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");
  if (!teamId) return NextResponse.json({ error: "teamId obrigatório" }, { status: 400 });

  const member = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId: session.user.id } },
  });
  if (!member) return NextResponse.json({ error: "Sem acesso" }, { status: 403 });

  const competitions = await prisma.competition.findMany({
    where: { teamId },
    select: {
      id: true, teamId: true, title: true, description: true,
      metric: true, startDate: true, endDate: true,
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

  const member = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: parsed.data.teamId, userId: session.user.id } },
  });
  if (!member || !["owner", "admin"].includes(member.role)) {
    return NextResponse.json({ error: "Apenas o Team Manager pode criar competições" }, { status: 403 });
  }

  const competition = await prisma.competition.create({
    data: {
      ...parsed.data,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
    },
  });

  return NextResponse.json(
    { ...competition, startDate: competition.startDate.toISOString(), endDate: competition.endDate.toISOString() },
    { status: 201 }
  );
}
