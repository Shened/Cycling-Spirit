import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id } = await params;
    const { status } = await req.json();

    if (!["accepted", "declined"].includes(status)) {
        return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }

    const friendship = await prisma.friendship.findUnique({ where: { id } });
    if (!friendship) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    // Só o receiver pode aceitar/recusar
    if (friendship.receiverId !== session.user.id) {
        return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const updated = await prisma.friendship.update({
        where: { id },
        data: { status },
    });

    return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id } = await params;

    const friendship = await prisma.friendship.findUnique({ where: { id } });
    if (!friendship) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    // Só os intervenientes podem eliminar
    if (friendship.senderId !== session.user.id && friendship.receiverId !== session.user.id) {
        return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    await prisma.friendship.delete({ where: { id } });
    return NextResponse.json({ message: "Eliminado" });
}