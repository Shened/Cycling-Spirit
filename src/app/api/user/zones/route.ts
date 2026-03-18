// src/app/api/user/zones/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const hrZoneSchema = z.array(
    z.object({
        zone: z.number().int().min(1),
        name: z.string(),
        min: z.number().int().min(0),
        max: z.number().int().min(0),
        color: z.string(),
    })
).min(1).max(10); // entre 1 e 10 zonas

const schema = z.object({
    hrZones: hrZoneSchema.optional().nullable(),
    ftpWatts: z.number().int().min(0).optional().nullable(),
});

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { ftpWatts: true, weightKg: true, hrZones: true },
    });

    return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });

    const user = await prisma.user.update({
        where: { id: session.user.id },
        data: {
            ...(parsed.data.ftpWatts !== undefined && { ftpWatts: parsed.data.ftpWatts }),
            ...(parsed.data.hrZones !== undefined && { hrZones: parsed.data.hrZones as object[] }),
        },
        select: { ftpWatts: true, weightKg: true, hrZones: true },
    });

    return NextResponse.json(user);
}