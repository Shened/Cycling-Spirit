import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") ?? session.user.id;
    const teamId = searchParams.get("teamId");
    const filter = searchParams.get("filter") ?? "all"; // "koms" | "top10" | "all"

    // Se pedir dados de outro user, verifica amizade
    if (userId !== session.user.id) {
        const friendship = await prisma.friendship.findFirst({
            where: {
                status: "accepted",
                OR: [
                    { senderId: session.user.id, receiverId: userId },
                    { senderId: userId, receiverId: session.user.id },
                ],
            },
        });
        if (!friendship) return NextResponse.json({ error: "Sem acesso" }, { status: 403 });
    }

    // Dados individuais
    if (!teamId) {
        const where = {
            userId,
            ...(filter === "koms" ? { komRank: 1 } : {}),
            ...(filter === "top10" ? { komRank: { gte: 1, lte: 10 } } : {}),
        };

        const [efforts, pr] = await Promise.all([
            prisma.stravaSegmentEffort.findMany({
                where,
                orderBy: { komRank: "asc" },
            }),
            prisma.stravaPersonalRecord.findUnique({ where: { userId } }),
        ]);

        return NextResponse.json({
            efforts: efforts.map((e) => ({ ...e, startDate: e.startDate.toISOString() })),
            personalRecord: pr,
            stats: {
                totalKoms: efforts.filter((e) => e.komRank === 1).length,
                totalTop10: efforts.filter((e) => (e.komRank ?? 99) <= 10).length,
                total: efforts.length,
            },
        });
    }

    // Batalha de equipa
    const members = await prisma.teamMember.findMany({
        where: { teamId },
        select: {
            userId: true,
            user: { select: { id: true, name: true, avatar: true } },
        },
    });

    const isMember = members.some((m) => m.userId === session.user.id);
    if (!isMember) return NextResponse.json({ error: "Sem acesso" }, { status: 403 });

    const memberIds = members.map((m) => m.userId);

    // Busca todos os esforços dos membros
    const allEfforts = await prisma.stravaSegmentEffort.findMany({
        where: { userId: { in: memberIds } },
        orderBy: { elapsedSeconds: "asc" },
    });

    // Agrupa por segment — encontra segmentos em comum
    const segmentMap = new Map<string, typeof allEfforts>();
    for (const effort of allEfforts) {
        if (!segmentMap.has(effort.segmentId)) {
            segmentMap.set(effort.segmentId, []);
        }
        segmentMap.get(effort.segmentId)!.push(effort);
    }

    // Segmentos onde mais de 1 membro tem esforço (batalha real)
    const battles = Array.from(segmentMap.entries())
        .filter(([, efforts]) => efforts.length > 1)
        .map(([segmentId, efforts]) => {
            const sorted = efforts.slice().sort((a, b) => a.elapsedSeconds - b.elapsedSeconds);
            return {
                segmentId,
                segmentName: sorted[0].segmentName,
                distanceM: sorted[0].distanceM,
                avgGrade: sorted[0].avgGrade,
                city: sorted[0].city,
                rankings: sorted.map((e, idx) => ({
                    position: idx + 1,
                    userId: e.userId,
                    user: members.find((m) => m.userId === e.userId)?.user,
                    elapsedSeconds: e.elapsedSeconds,
                    komRank: e.komRank,
                })),
            };
        })
        .sort((a, b) => a.segmentName.localeCompare(b.segmentName));

    // Leaderboard de KOMs por membro
    const komLeaderboard = members.map((m) => {
        const userEfforts = allEfforts.filter((e) => e.userId === m.userId);
        return {
            user: m.user,
            totalKoms: userEfforts.filter((e) => e.komRank === 1).length,
            totalTop10: userEfforts.filter((e) => (e.prRank ?? 99) <= 10).length,
            total: userEfforts.length,
            // Maior distância numa volta
            longestKm: userEfforts.length > 0
                ? Math.round(Math.max(...userEfforts.map((e) => e.distanceM)) / 10) / 100
                : 0,
        };
    }).sort((a, b) => b.totalKoms - a.totalKoms);

    return NextResponse.json({ battles, komLeaderboard, members });
}