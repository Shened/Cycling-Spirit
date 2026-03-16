import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    if (!q || q.length < 2) return NextResponse.json({ users: [], teams: [] });

    const [users, teams] = await Promise.all([
        prisma.user.findMany({
            where: {
                AND: [
                    { id: { not: session.user.id } },
                    { name: { contains: q, mode: "insensitive" } },
                ],
            },
            select: { id: true, name: true, email: true, avatar: true },
            take: 5,
        }),
        prisma.team.findMany({
            where: { name: { contains: q, mode: "insensitive" } },
            select: {
                id: true, name: true, description: true,
                _count: { select: { members: true } },
            },
            take: 5,
        }),
    ]);

    return NextResponse.json({ users, teams });
}