import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
    name: z.string().min(2).max(100),
    description: z.string().optional().nullable(),
    teamId: z.string().optional().nullable(),
    type: z.enum(["single", "multistage"]).default("multistage"),
    activityType: z.enum(["ride", "run", "walk", "swim", "hike"]).default("ride"),
    startDate: z.string(),
    endDate: z.string(),
});

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");

    const tours = await prisma.tour.findMany({
        where: {
            OR: [
                { organiserId: session.user.id },
                { participants: { some: { userId: session.user.id, status: "accepted" } } },
                ...(teamId ? [{ teamId }] : []),
            ],
        },
        select: {
            id: true, name: true, description: true, type: true,
            status: true, startDate: true, endDate: true,
            organiser: { select: { id: true, name: true, avatar: true } },
            team: { select: { id: true, name: true } },
            _count: { select: { participants: true, stages: true } },
        },
        orderBy: { startDate: "desc" },
    });

    return NextResponse.json(
        tours.map((t) => ({
            ...t,
            startDate: t.startDate.toISOString(),
            endDate: t.endDate.toISOString(),
        }))
    );
}

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

    const tour = await prisma.tour.create({
        data: {
            ...parsed.data,
            startDate: new Date(parsed.data.startDate),
            endDate: new Date(parsed.data.endDate),
            organiserId: session.user.id,
            // Organiser é automaticamente participante
            participants: {
                create: { userId: session.user.id, status: "accepted" },
            },
        },
        select: {
            id: true, name: true, type: true, status: true,
            startDate: true, endDate: true,
            organiser: { select: { id: true, name: true } },
        },
    });

    return NextResponse.json(
        { ...tour, startDate: tour.startDate.toISOString(), endDate: tour.endDate.toISOString() },
        { status: 201 }
    );
}