import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateRoleSchema = z.object({
    userId: z.string(),
    role: z.enum(["member", "admin"]),
});

const removeSchema = z.object({
    userId: z.string(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id: teamId } = await params;

    const member = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: session.user.id } },
    });
    if (!member) return NextResponse.json({ error: "Sem acesso" }, { status: 403 });

    const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: {
            id: true, name: true, slug: true, description: true,
            logo: true, ownerId: true,
            owner: { select: { id: true, name: true, email: true, avatar: true } },
            members: {
                select: {
                    userId: true, role: true, joinedAt: true,
                    user: { select: { id: true, name: true, email: true, avatar: true } },
                },
            },
            invitations: {
                where: { acceptedAt: null, expiresAt: { gt: new Date() } },
                select: {
                    id: true, email: true, token: true, createdAt: true, expiresAt: true,
                    invitedBy: { select: { id: true, name: true } },
                },
            },
            teamJoinRequests: {
                where: { status: "pending" },
                select: {
                    id: true, message: true, createdAt: true,
                    user: { select: { id: true, name: true, email: true, avatar: true } },
                },
            },
            competitions: {
                where: { status: "pending" },
                select: {
                    id: true, title: true, metric: true, startDate: true, endDate: true,
                    createdBy: { select: { id: true, name: true } },
                },
            },
            tours: {
                select: {
                    id: true, name: true, type: true, status: true,
                    startDate: true, endDate: true,
                    _count: { select: { participants: true, stages: true } },
                },
                orderBy: { startDate: "desc" },
                take: 5,
            },
            _count: {
                select: { members: true, competitions: true, tours: true },
            },
        },
    });

    if (!team) return NextResponse.json({ error: "Equipa não encontrada" }, { status: 404 });

    return NextResponse.json({
        ...team,
        competitions: team.competitions.map((c) => ({
            ...c,
            startDate: c.startDate.toISOString(),
            endDate: c.endDate.toISOString(),
        })),
        tours: team.tours.map((t) => ({
            ...t,
            startDate: t.startDate.toISOString(),
            endDate: t.endDate.toISOString(),
        })),
        joinRequests: team.teamJoinRequests.map((r) => ({
            ...r,
            createdAt: r.createdAt.toISOString(),
        })),
        invitations: team.invitations.map((i) => ({
            ...i,
            createdAt: i.createdAt.toISOString(),
            expiresAt: i.expiresAt.toISOString(),
        })),
    });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id: teamId } = await params;

    const myMember = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: session.user.id } },
    });
    if (!myMember || myMember.role !== "owner") {
        return NextResponse.json({ error: "Apenas o owner pode alterar roles" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateRoleSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

    if (parsed.data.userId === session.user.id) {
        return NextResponse.json({ error: "Não podes alterar a tua própria role" }, { status: 400 });
    }

    const updated = await prisma.teamMember.update({
        where: { teamId_userId: { teamId, userId: parsed.data.userId } },
        data: { role: parsed.data.role },
    });

    return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id: teamId } = await params;

    const myMember = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: session.user.id } },
    });
    if (!myMember || !["owner", "admin"].includes(myMember.role)) {
        return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = removeSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

    const team = await prisma.team.findUnique({ where: { id: teamId }, select: { ownerId: true } });
    if (parsed.data.userId === team?.ownerId) {
        return NextResponse.json({ error: "Não podes remover o owner" }, { status: 400 });
    }

    await prisma.teamMember.delete({
        where: { teamId_userId: { teamId, userId: parsed.data.userId } },
    });

    return NextResponse.json({ message: "Membro removido" });
}