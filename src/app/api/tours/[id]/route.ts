import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().optional().nullable(),
    status: z.enum(["upcoming", "active", "finished"]).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id } = await params;

    const tour = await prisma.tour.findUnique({
        where: { id },
        select: {
            id: true, name: true, description: true, type: true,
            status: true, startDate: true, endDate: true, organiserId: true,
            organiser: { select: { id: true, name: true, avatar: true } },
            team: { select: { id: true, name: true } },
            tourTeams: {
                select: {
                    id: true, name: true, color: true,
                    participants: {
                        select: {
                            userId: true, status: true,
                            user: { select: { id: true, name: true, avatar: true } },
                        },
                    },
                },
            },
            participants: {
                select: {
                    id: true, userId: true, status: true, tourTeamId: true,
                    user: { select: { id: true, name: true, avatar: true } },
                    tourTeam: { select: { id: true, name: true, color: true } },
                },
            },
            stages: {
                orderBy: { number: "asc" },
                select: {
                    id: true, number: true, name: true, date: true,
                    distanceKm: true, elevationM: true, type: true, description: true,
                    results: {
                        orderBy: { position: "asc" },
                        select: {
                            id: true, userId: true, position: true, timeSeconds: true,
                            bonusSeconds: true, points: true, dnf: true, stravaActivityId: true,
                            user: { select: { id: true, name: true, avatar: true } },
                        },
                    },
                    specialPoints: {
                        select: {
                            id: true, name: true, type: true, km: true,
                            results: {
                                orderBy: { position: "asc" },
                                select: {
                                    id: true, userId: true, position: true, points: true,
                                    user: { select: { id: true, name: true, avatar: true } },
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    if (!tour) return NextResponse.json({ error: "Tour não encontrado" }, { status: 404 });

    // Verifica acesso
    const isParticipant = tour.participants.some((p) => p.userId === session.user.id);
    const isOrganiser = tour.organiserId === session.user.id;
    if (!isParticipant && !isOrganiser) {
        return NextResponse.json({ error: "Sem acesso" }, { status: 403 });
    }

    return NextResponse.json({
        ...tour,
        startDate: tour.startDate.toISOString(),
        endDate: tour.endDate.toISOString(),
        stages: tour.stages.map((s) => ({ ...s, date: s.date.toISOString() })),
    });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id } = await params;
    const tour = await prisma.tour.findUnique({ where: { id }, select: { organiserId: true } });
    if (!tour || tour.organiserId !== session.user.id) {
        return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

    const updated = await prisma.tour.update({
        where: { id },
        data: {
            ...parsed.data,
            ...(parsed.data.startDate ? { startDate: new Date(parsed.data.startDate) } : {}),
            ...(parsed.data.endDate ? { endDate: new Date(parsed.data.endDate) } : {}),
        },
    });

    return NextResponse.json({ ...updated, startDate: updated.startDate.toISOString(), endDate: updated.endDate.toISOString() });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id } = await params;
    const tour = await prisma.tour.findUnique({ where: { id }, select: { organiserId: true } });
    if (!tour || tour.organiserId !== session.user.id) {
        return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    await prisma.tour.delete({ where: { id } });
    return NextResponse.json({ message: "Tour eliminado" });
}