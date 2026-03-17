import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string; inviteId: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id: teamId, inviteId } = await params;

    const member = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: session.user.id } },
    });
    if (!member || !["owner", "admin"].includes(member.role)) {
        return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    await prisma.teamInvitation.delete({ where: { id: inviteId } });
    return NextResponse.json({ message: "Convite cancelado" });
}