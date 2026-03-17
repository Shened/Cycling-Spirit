import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2).max(100).optional(),
  ftpWatts: z.number().int().min(0).nullable().optional(),
  weightKg: z.number().min(0).nullable().optional(),
  defaultActivityType: z.enum([
    "ride", "mountain_bike", "gravel_ride", "e_bike", "virtual_ride",
    "run", "trail_run", "walk", "hike", "swim"
  ]).optional(),
  isPublic: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, name: true, email: true, avatar: true,
      ftpWatts: true, weightKg: true, stravaId: true,
      dashboardWidgets: true, defaultActivityType: true, isPublic: true,
    },
  });

  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: parsed.data,
    select: {
      id: true, name: true, email: true,
      ftpWatts: true, weightKg: true, defaultActivityType: true,
    },
  });

  return NextResponse.json(user);
}