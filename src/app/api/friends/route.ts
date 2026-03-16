import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const userId = session.user.id;

    const [accepted, pending, received] = await Promise.all([
        // Amigos aceites
        prisma.friendship.findMany({
            where: {
                status: "accepted",
                OR: [{ senderId: userId }, { receiverId: userId }],
            },
            select: {
                id: true, status: true, createdAt: true,
                sender: { select: { id: true, name: true, avatar: true } },
                receiver: { select: { id: true, name: true, avatar: true } },
            },
        }),
        // Pedidos enviados pendentes
        prisma.friendship.findMany({
            where: { senderId: userId, status: "pending" },
            select: {
                id: true, status: true, createdAt: true,
                receiver: { select: { id: true, name: true, avatar: true } },
            },
        }),
        // Pedidos recebidos pendentes
        prisma.friendship.findMany({
            where: { receiverId: userId, status: "pending" },
            select: {
                id: true, status: true, createdAt: true,
                sender: { select: { id: true, name: true, avatar: true } },
            },
        }),
    ]);

    return NextResponse.json({ accepted, pending, received });
}

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { receiverId } = await req.json();
    if (!receiverId) return NextResponse.json({ error: "receiverId obrigatório" }, { status: 400 });
    if (receiverId === session.user.id) return NextResponse.json({ error: "Não podes adicionar-te a ti próprio" }, { status: 400 });

    // Verifica se já existe
    const existing = await prisma.friendship.findFirst({
        where: {
            OR: [
                { senderId: session.user.id, receiverId },
                { senderId: receiverId, receiverId: session.user.id },
            ],
        },
    });

    if (existing) {
        return NextResponse.json({ error: "Pedido já existe" }, { status: 409 });
    }

    const friendship = await prisma.friendship.create({
        data: { senderId: session.user.id, receiverId, status: "pending" },
    });

    return NextResponse.json(friendship, { status: 201 });
}