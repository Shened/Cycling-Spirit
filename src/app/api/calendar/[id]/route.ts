import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  type: z.enum(["ride", "run", "walk", "swim", "hike"]).optional(),
  targetDistanceKm: z.number().min(0).optional().nullable(),
  targetDurationMin: z.number().int().min(0).optional().nullable(),
  targetWatts: z.number().int().min(0).optional().nullable(),
  scheduledFor: z.string().optional(),
  isTeamShared: z.boolean().optional(),
  completed: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;

  const planned = await prisma.plannedActivity.findUnique({ where: { id } });
  if (!planned || planned.userId !== session.user.id)
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const updated = await prisma.plannedActivity.update({
    where: { id },
    data: {
      ...parsed.data,
      ...(parsed.data.scheduledFor ? { scheduledFor: new Date(parsed.data.scheduledFor) } : {}),
    },
  });

  return NextResponse.json({ ...updated, scheduledFor: updated.scheduledFor.toISOString() });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;

  const planned = await prisma.plannedActivity.findUnique({ where: { id } });
  if (!planned || planned.userId !== session.user.id)
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  await prisma.plannedActivity.delete({ where: { id } });
  return NextResponse.json({ message: "Eliminado" });
}
