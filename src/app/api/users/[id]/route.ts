import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, subWeeks } from "date-fns";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id } = await params;

    // Verifica se são amigos
    const friendship = await prisma.friendship.findFirst({
        where: {
            status: "accepted",
            OR: [
                { senderId: session.user.id, receiverId: id },
                { senderId: id, receiverId: session.user.id },
            ],
        },
    });

    const isFriend = !!friendship || id === session.user.id;

    const user = await prisma.user.findUnique({
        where: { id },
        select: {
            id: true, name: true, avatar: true, createdAt: true,
            teamMemberships: {
                select: {
                    role: true,
                    team: { select: { id: true, name: true, slug: true } },
                },
            },
        },
    });

    if (!user) return NextResponse.json({ error: "Utilizador não encontrado" }, { status: 404 });

    // Verifica pedido pendente
    const pendingRequest = await prisma.friendship.findFirst({
        where: {
            OR: [
                { senderId: session.user.id, receiverId: id, status: "pending" },
                { senderId: id, receiverId: session.user.id, status: "pending" },
            ],
        },
        select: { id: true, senderId: true, status: true },
    });

    // Stats e atividades só para amigos
    if (!isFriend) {
        return NextResponse.json({
            user,
            isFriend: false,
            pendingRequest,
            stats: null,
            recentActivities: [],
            weeklyKm: [],
        });
    }

    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const [monthlyActivities, recentActivities, weeklyKm] = await Promise.all([
        prisma.activity.findMany({
            where: { userId: id, startedAt: { gte: monthStart, lte: monthEnd } },
        }),
        prisma.activity.findMany({
            where: { userId: id },
            orderBy: { startedAt: "desc" },
            take: 5,
        }),
        Promise.all(
            Array.from({ length: 8 }, (_, i) => {
                const weekStart = startOfWeek(subWeeks(now, 7 - i), { weekStartsOn: 1 });
                const weekEnd = endOfWeek(subWeeks(now, 7 - i), { weekStartsOn: 1 });
                return prisma.activity.aggregate({
                    where: { userId: id, startedAt: { gte: weekStart, lte: weekEnd } },
                    _sum: { distanceKm: true },
                }).then((r) => ({
                    week: weekStart.toLocaleDateString("pt", { day: "2-digit", month: "short" }),
                    km: Math.round((r._sum.distanceKm ?? 0) * 10) / 10,
                }));
            })
        ),
    ]);

    const stats = {
        totalKm: Math.round(monthlyActivities.reduce((s, a) => s + a.distanceKm, 0) * 10) / 10,
        totalHours: Math.round((monthlyActivities.reduce((s, a) => s + a.durationSeconds, 0) / 3600) * 10) / 10,
        totalActivities: monthlyActivities.length,
        totalElevation: monthlyActivities.reduce((s, a) => s + (a.elevationM ?? 0), 0),
    };

    return NextResponse.json({
        user,
        isFriend: true,
        pendingRequest: null,
        stats,
        recentActivities: recentActivities.map((a) => ({ ...a, startedAt: a.startedAt.toISOString() })),
        weeklyKm,
    });
}