import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  type: z.enum(["ride", "run", "walk", "swim", "hike"]).optional(),
  distanceKm: z.number().min(0).optional(),
  durationSeconds: z.number().int().min(0).optional(),
  elevationM: z.number().int().min(0).optional().nullable(),
  avgWatts: z.number().int().min(0).optional().nullable(),
  avgHeartRate: z.number().min(0).optional().nullable(),
  avgSpeedKmh: z.number().min(0).optional().nullable(),
  calories: z.number().int().min(0).optional().nullable(),
  startedAt: z.string().optional(),
});

async function getActivity(id: string, userId: string) {
  const activity = await prisma.activity.findUnique({ where: { id } });
  if (!activity) return null;
  if (activity.userId !== userId) return null;
  return activity;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  const activity = await getActivity(id, session.user.id);
  if (!activity) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json({ ...activity, startedAt: activity.startedAt.toISOString() });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  const existing = await getActivity(id, session.user.id);
  if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const updated = await prisma.activity.update({
    where: { id },
    data: {
      ...parsed.data,
      ...(parsed.data.startedAt ? { startedAt: new Date(parsed.data.startedAt) } : {}),
    },
  });

  return NextResponse.json({ ...updated, startedAt: updated.startedAt.toISOString() });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  const existing = await getActivity(id, session.user.id);
  if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  await prisma.activity.delete({ where: { id } });
  return NextResponse.json({ message: "Eliminado com sucesso" });
}
