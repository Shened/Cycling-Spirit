import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const respondSchema = z.object({
    status: z.enum(["accepted", "declined"]),
});

const assignTeamSchema = z.object({
    participantId: z.string(),
    tourTeamId: z.string().nullable(),
});

// Aceitar/recusar convite
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id: tourId } = await params;
    const body = await req.json();

    // Assign to tour team (organiser only)
    if ("participantId" in body) {
        const parsed = assignTeamSchema.safeParse(body);
        if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

        const tour = await prisma.tour.findUnique({ where: { id: tourId }, select: { organiserId: true } });
        if (!tour || tour.organiserId !== session.user.id) {
            return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
        }

        const updated = await prisma.tourParticipant.update({
            where: { id: parsed.data.participantId },
            data: { tourTeamId: parsed.data.tourTeamId },
        });
        return NextResponse.json(updated);
    }

    // Respond to invitation
    const parsed = respondSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

    const participant = await prisma.tourParticipant.findUnique({
        where: { tourId_userId: { tourId, userId: session.user.id } },
    });
    if (!participant) return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });

    const updated = await prisma.tourParticipant.update({
        where: { id: participant.id },
        data: { status: parsed.data.status },
    });

    return NextResponse.json(updated);
}