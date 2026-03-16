import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { slugify } from "@/lib/utils";

const createSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional().nullable(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const teams = await prisma.team.findMany({
    where: { members: { some: { userId: session.user.id } } },
    select: {
      id: true, name: true, slug: true, description: true, logo: true, ownerId: true,
      owner: { select: { id: true, name: true, email: true, avatar: true } },
      members: {
        select: {
          userId: true, role: true, joinedAt: true,
          user: { select: { id: true, name: true, email: true, avatar: true } },
        },
      },
      _count: { select: { members: true } },
    },
  });

  return NextResponse.json(teams);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const baseSlug = slugify(parsed.data.name);
  const rand = Math.random().toString(36).slice(2, 7);
  const slug = `${baseSlug}-${rand}`;

  const team = await prisma.team.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      slug,
      ownerId: session.user.id,
      members: {
        create: { userId: session.user.id, role: "owner" },
      },
    },
    select: {
      id: true, name: true, slug: true, description: true, logo: true, ownerId: true,
      owner: { select: { id: true, name: true, email: true, avatar: true } },
      members: {
        select: {
          userId: true, role: true, joinedAt: true,
          user: { select: { id: true, name: true, email: true, avatar: true } },
        },
      },
    },
  });

  return NextResponse.json(team, { status: 201 });
}
