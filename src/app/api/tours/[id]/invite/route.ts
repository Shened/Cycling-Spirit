import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
    userId: z.string(),
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
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

    const existing = await prisma.tourParticipant.findUnique({
        where: { tourId_userId: { tourId, userId: parsed.data.userId } },
    });
    if (existing) return NextResponse.json({ error: "Utilizador já convidado" }, { status: 409 });

    const participant = await prisma.tourParticipant.create({
        data: { tourId, userId: parsed.data.userId, status: "pending" },
        select: {
            id: true, status: true,
            user: { select: { id: true, name: true, avatar: true } },
        },
    });

    return NextResponse.json(participant, { status: 201 });
}