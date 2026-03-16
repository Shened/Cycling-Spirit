import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id: teamId } = await params;

  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId: session.user.id } },
  });
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = z.object({ email: z.string().email() }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Email inválido" }, { status: 400 });

  const { email } = parsed.data;

  const alreadyMember = await prisma.teamMember.findFirst({
    where: { teamId, user: { email } },
  });
  if (alreadyMember) return NextResponse.json({ error: "Utilizador já é membro" }, { status: 409 });

  const existing = await prisma.teamInvitation.findFirst({
    where: { teamId, email, acceptedAt: null, expiresAt: { gt: new Date() } },
  });
  if (existing) return NextResponse.json({ error: "Convite pendente já existe" }, { status: 409 });

  const token = randomBytes(32).toString("hex");
  const invitation = await prisma.teamInvitation.create({
    data: {
      teamId,
      email,
      token,
      invitedById: session.user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  // TODO: send email with invitation link
  const inviteUrl = `${process.env.NEXTAUTH_URL}/invite/${token}`;
  console.log("Invite URL:", inviteUrl);

  return NextResponse.json({ message: "Convite enviado", token, inviteUrl }, { status: 201 });
}
