import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
    name: z.string().min(1).max(50),
    color: z.string().default("#2B8FBF"),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id: tourId } = await params;

    const tour = await prisma.tour.findUnique({ where: { id: tourId }, select: { organiserId: true } });
    if (!tour || tour.organiserId !== session.user.id) {
        return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

    const team = await prisma.tourTeam.create({
        data: { ...parsed.data, tourId },
        select: {
            id: true, name: true, color: true,
            participants: {
                select: {
                    userId: true,
                    user: { select: { id: true, name: true, avatar: true } },
                },
            },
        },
    });

    return NextResponse.json(team, { status: 201 });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id: tourId } = await params;

    const teams = await prisma.tourTeam.findMany({
        where: { tourId },
        select: {
            id: true, name: true, color: true,
            participants: {
                select: {
                    userId: true, status: true,
                    user: { select: { id: true, name: true, avatar: true } },
                },
            },
        },
    });

    return NextResponse.json(teams);
}