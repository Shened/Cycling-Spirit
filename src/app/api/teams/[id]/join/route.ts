import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const respondSchema = z.object({
    requestId: z.string(),
    status: z.enum(["accepted", "declined"]),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id: teamId } = await params;
    const body = await req.json();
    const message = body.message ?? null;

    const existing = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: session.user.id } },
    });
    if (existing) return NextResponse.json({ error: "Já és membro desta equipa" }, { status: 409 });

    const existingRequest = await prisma.teamJoinRequest.findUnique({
        where: { teamId_userId: { teamId, userId: session.user.id } },
    });
    if (existingRequest) return NextResponse.json({ error: "Já tens um pedido pendente" }, { status: 409 });

    const request = await prisma.teamJoinRequest.create({
        data: { teamId, userId: session.user.id, message, status: "pending" },
        select: {
            id: true, status: true, message: true,
            user: { select: { id: true, name: true, avatar: true } },
        },
    });

    return NextResponse.json(request, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id: teamId } = await params;

    const myMember = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: session.user.id } },
    });
    if (!myMember || !["owner", "admin"].includes(myMember.role)) {
        return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = respondSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

    const request = await prisma.teamJoinRequest.findUnique({
        where: { id: parsed.data.requestId },
        select: { userId: true, teamId: true },
    });
    if (!request) return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });

    await prisma.teamJoinRequest.update({
        where: { id: parsed.data.requestId },
        data: { status: parsed.data.status },
    });

    if (parsed.data.status === "accepted") {
        await prisma.teamMember.create({
            data: { teamId, userId: request.userId, role: "member" },
        });
    }

    return NextResponse.json({ message: parsed.data.status === "accepted" ? "Membro adicionado" : "Pedido recusado" });
}