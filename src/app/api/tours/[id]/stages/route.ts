import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
    number: z.number().int().min(1),
    name: z.string().min(1).max(100),
    date: z.string(),
    distanceKm: z.number().min(0).optional().nullable(),
    elevationM: z.number().int().min(0).optional().nullable(),
    type: z.enum(["regular", "sprint", "mountain", "tt"]).default("regular"),
    description: z.string().optional().nullable(),
    polyline: z.string().optional().nullable(),
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
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });

    const stage = await prisma.tourStage.create({
        data: {
            ...parsed.data,
            tourId,
            date: new Date(parsed.data.date),
        },
    });

    return NextResponse.json({ ...stage, date: stage.date.toISOString() }, { status: 201 });
}