import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  widgets: z.array(z.string()).min(1).max(8),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { dashboardWidgets: parsed.data.widgets },
    select: { dashboardWidgets: true },
  });

  return NextResponse.json(user);
}
