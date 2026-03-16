import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { token } = await params;

  const invitation = await prisma.teamInvitation.findUnique({
    where: { token },
    include: { team: true },
  });

  if (!invitation) return NextResponse.json({ error: "Convite inválido" }, { status: 404 });
  if (invitation.acceptedAt) return NextResponse.json({ error: "Convite já usado" }, { status: 410 });
  if (invitation.expiresAt < new Date()) return NextResponse.json({ error: "Convite expirado" }, { status: 410 });

  const already = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: invitation.teamId, userId: session.user.id } },
  });
  if (already) return NextResponse.json({ error: "Já és membro" }, { status: 409 });

  await prisma.$transaction([
    prisma.teamMember.create({
      data: { teamId: invitation.teamId, userId: session.user.id, role: "member" },
    }),
    prisma.teamInvitation.update({
      where: { token },
      data: { acceptedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ message: "Entraste na equipa!", team: invitation.team });
}
