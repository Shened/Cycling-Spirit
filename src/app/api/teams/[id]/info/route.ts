import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth } from "date-fns";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id: teamId } = await params;

    const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: {
            id: true, name: true, description: true,
            owner: { select: { id: true, name: true, avatar: true } },
            members: { select: { userId: true } },
            _count: { select: { members: true } },
        },
    });

    if (!team) return NextResponse.json({ error: "Equipa não encontrada" }, { status: 404 });

    // Total km da equipa este mês
    const now = new Date();
    const monthKm = await prisma.activity.aggregate({
        where: {
            userId: { in: team.members.map((m) => m.userId) },
            startedAt: { gte: startOfMonth(now), lte: endOfMonth(now) },
        },
        _sum: { distanceKm: true },
    });

    const isMember = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: session.user.id } },
    });

    const hasRequest = await prisma.teamJoinRequest.findUnique({
        where: { teamId_userId: { teamId, userId: session.user.id } },
    });

    return NextResponse.json({
        ...team,
        monthlyKm: Math.round((monthKm._sum.distanceKm ?? 0) * 10) / 10,
        isMember: !!isMember,
        hasRequest: !!hasRequest,
        requestStatus: hasRequest?.status ?? null,
    });
} 