import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const resultSchema = z.object({
    userId: z.string(),
    position: z.number().int().min(1).optional().nullable(),
    timeSeconds: z.number().int().min(0).optional().nullable(),
    bonusSeconds: z.number().int().default(0),
    points: z.number().int().default(0),
    dnf: z.boolean().default(false),
    stravaActivityId: z.string().optional().nullable(),
});

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; stageId: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id: tourId, stageId } = await params;

    const tour = await prisma.tour.findUnique({ where: { id: tourId }, select: { organiserId: true } });
    if (!tour || tour.organiserId !== session.user.id) {
        return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await req.json();

    // Aceita array ou objeto único
    const entries = Array.isArray(body) ? body : [body];

    const results = [];
    for (const entry of entries) {
        const parsed = resultSchema.safeParse(entry);
        if (!parsed.success) continue;

        const result = await prisma.tourStageResult.upsert({
            where: { stageId_userId: { stageId, userId: parsed.data.userId } },
            create: { stageId, ...parsed.data },
            update: parsed.data,
            select: {
                id: true, position: true, timeSeconds: true,
                bonusSeconds: true, points: true, dnf: true,
                user: { select: { id: true, name: true, avatar: true } },
            },
        });
        results.push(result);
    }

    return NextResponse.json(results, { status: 201 });
}