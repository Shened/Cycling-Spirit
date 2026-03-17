import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const inviteSchema = z.object({
    userId: z.string(),
});

const respondSchema = z.object({
    status: z.enum(["accepted", "declined"]),
    inviteId: z.string(),
});

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id } = await params;

    const competition = await prisma.competition.findUnique({
        where: { id },
        select: { createdById: true, teamId: true },
    });

    if (!competition) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    // Só o criador ou manager pode eliminar
    if (competition.createdById !== session.user.id) {
        if (competition.teamId) {
            const member = await prisma.teamMember.findUnique({
                where: { teamId_userId: { teamId: competition.teamId, userId: session.user.id } },
            });
            if (!member || !["owner", "admin"].includes(member.role)) {
                return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
            }
        } else {
            return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
        }
    }

    await prisma.competition.delete({ where: { id } });
    return NextResponse.json({ message: "Eliminada com sucesso" });
}

// Convidar utilizador
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id } = await params;
    const competition = await prisma.competition.findUnique({
        where: { id },
        select: { createdById: true },
    });

    if (!competition || competition.createdById !== session.user.id) {
        return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

    const existing = await prisma.competitionInvite.findUnique({
        where: { competitionId_userId: { competitionId: id, userId: parsed.data.userId } },
    });
    if (existing) return NextResponse.json({ error: "Utilizador já convidado" }, { status: 409 });

    const invite = await prisma.competitionInvite.create({
        data: { competitionId: id, userId: parsed.data.userId, status: "pending" },
        select: {
            id: true, status: true,
            user: { select: { id: true, name: true, avatar: true } },
        },
    });

    return NextResponse.json(invite, { status: 201 });
}

// Aceitar/recusar convite
// Aceitar/recusar convite
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const body = await req.json();

    // Aprovar/rejeitar competição (manager)
    if ("status" in body && !("inviteId" in body)) {
        const { id } = await params;
        const parsed = z.object({ status: z.enum(["approved", "rejected"]) }).safeParse(body);
        if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

        const competition = await prisma.competition.findUnique({
            where: { id },
            select: { teamId: true, status: true },
        });
        if (!competition) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

        if (competition.teamId) {
            const member = await prisma.teamMember.findUnique({
                where: { teamId_userId: { teamId: competition.teamId, userId: session.user.id } },
            });
            if (!member || !["owner", "admin"].includes(member.role)) {
                return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
            }
        }

        const updated = await prisma.competition.update({
            where: { id },
            data: { status: parsed.data.status },
        });

        // Se aprovada, cria entries para todos os membros da equipa
        if (parsed.data.status === "approved" && competition.teamId) {
            const members = await prisma.teamMember.findMany({
                where: { teamId: competition.teamId },
                select: { userId: true },
            });
            await prisma.competitionEntry.createMany({
                data: members.map((m) => ({
                    competitionId: id,
                    userId: m.userId,
                    value: 0,
                })),
                skipDuplicates: true,
            });
        }

        return NextResponse.json({
            ...updated,
            startDate: updated.startDate.toISOString(),
            endDate: updated.endDate.toISOString(),
        });
    }

    // Aceitar/recusar convite
    const parsed = respondSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

    const { id } = await params;

    const invite = await prisma.competitionInvite.findUnique({
        where: { id: parsed.data.inviteId },
    });

    if (!invite || invite.userId !== session.user.id) {
        return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const updated = await prisma.competitionInvite.update({
        where: { id: parsed.data.inviteId },
        data: { status: parsed.data.status },
    });

    // Se aceitou o convite, cria entry na competição
    if (parsed.data.status === "accepted") {
        await prisma.competitionEntry.upsert({
            where: { competitionId_userId: { competitionId: id, userId: session.user.id } },
            create: { competitionId: id, userId: session.user.id, value: 0 },
            update: {},
        });
    }

    return NextResponse.json(updated);
}