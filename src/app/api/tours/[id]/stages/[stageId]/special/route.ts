import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getSegmentEffortsForParticipants } from "@/lib/strava";

const createPointSchema = z.object({
    name: z.string().min(1).max(100),
    type: z.enum(["sprint", "mountain"]),
    km: z.number().min(0).optional().nullable(),
    stravaSegmentId: z.string().optional().nullable(),
    stageDate: z.string().optional().nullable(),
    results: z.array(z.object({
        userId: z.string(),
        position: z.number().int().min(1),
        points: z.number().int().default(0),
    })).optional(),
});

const SPRINT_POINTS = [5, 3, 2, 1];
const MOUNTAIN_POINTS = [5, 3, 2, 1];

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; stageId: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id: tourId, stageId } = await params;

    const tour = await prisma.tour.findUnique({
        where: { id: tourId },
        select: {
            organiserId: true,
            participants: {
                where: { status: "accepted" },
                select: { userId: true },
            },
        },
    });

    if (!tour || tour.organiserId !== session.user.id) {
        return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createPointSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

    const { results: manualResults, stravaSegmentId, stageDate, ...pointData } = parsed.data;

    let finalResults: { userId: string; position: number; points: number }[] = [];

    // Se tem Strava Segment ID, busca automaticamente
    if (stravaSegmentId && stageDate) {
        try {
            const efforts = await getSegmentEffortsForParticipants(
                tour.participants,
                stravaSegmentId,
                new Date(stageDate)
            );

            const pointsTable = pointData.type === "sprint" ? SPRINT_POINTS : MOUNTAIN_POINTS;

            finalResults = efforts.map((effort, idx) => ({
                userId: effort.userId,
                position: idx + 1,
                points: pointsTable[idx] ?? 0,
            }));

            if (finalResults.length === 0) {
                return NextResponse.json({
                    error: "Nenhum participante tem esforço neste segment neste dia. Verifica o Segment ID e a data da etapa.",
                }, { status: 404 });
            }
        } catch (err) {
            console.error("Strava segment error:", err);
            return NextResponse.json({ error: "Erro ao buscar dados do Strava" }, { status: 500 });
        }
    } else if (manualResults && manualResults.length > 0) {
        // Registo manual
        finalResults = manualResults;
    }

    const point = await prisma.tourSpecialPoint.create({
        data: {
            ...pointData,
            stageId,
            stravaSegmentId: stravaSegmentId ?? null,
            ...(finalResults.length > 0 ? {
                results: { create: finalResults },
            } : {}),
        },
        select: {
            id: true, name: true, type: true, km: true, stravaSegmentId: true,
            results: {
                orderBy: { position: "asc" },
                select: {
                    id: true, position: true, points: true,
                    user: { select: { id: true, name: true, avatar: true } },
                },
            },
        },
    });

    return NextResponse.json(point, { status: 201 });
}