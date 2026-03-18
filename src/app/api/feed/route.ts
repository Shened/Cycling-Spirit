// src/app/api/feed/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor"); // ID da última atividade (para paginação infinita)
    const limit = 20;

    // Busca todos os amigos aceites
    const friendships = await prisma.friendship.findMany({
        where: {
            status: "accepted",
            OR: [{ senderId: userId }, { receiverId: userId }],
        },
        select: { senderId: true, receiverId: true },
    });

    const friendIds = friendships.map((f) =>
        f.senderId === userId ? f.receiverId : f.senderId
    );

    // Inclui o próprio utilizador no feed
    const feedUserIds = [userId, ...friendIds];

    const activities = await prisma.activity.findMany({
        where: {
            userId: { in: feedUserIds },
            ...(cursor ? { id: { lt: cursor } } : {}),
        },
        orderBy: { startedAt: "desc" },
        take: limit + 1, // +1 para saber se há mais
        select: {
            id: true,
            title: true,
            type: true,
            distanceKm: true,
            durationSeconds: true,
            elevationM: true,
            avgWatts: true,
            avgHeartRate: true,
            avgSpeedKmh: true,
            calories: true,
            polyline: true,
            isManual: true,
            startedAt: true,
            userId: true,
            user: {
                select: { id: true, name: true, avatar: true },
            },
        },
    });

    const hasMore = activities.length > limit;
    const items = hasMore ? activities.slice(0, limit) : activities;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return NextResponse.json({
        activities: items.map((a) => ({ ...a, startedAt: a.startedAt.toISOString() })),
        nextCursor,
        friendCount: friendIds.length,
    });
}