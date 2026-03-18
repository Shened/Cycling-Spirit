// src/app/api/strava/webhook/route.ts
// Substitui o ficheiro existente

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
    syncSingleStravaActivity,
    deleteStravaActivity,
    syncPersonalRecords,
} from "@/lib/strava";
import { syncActiveCompetitionsForUser } from "@/lib/competitions";

// ─── GET — Validação do webhook pelo Strava ───────────────────────────────────
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);

    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    if (
        mode === "subscribe" &&
        token === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN
    ) {
        console.log("[webhook] Subscrição validada pelo Strava");
        return NextResponse.json({ "hub.challenge": challenge });
    }

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ─── POST — Eventos do Strava ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    let body: {
        object_type: string;
        aspect_type: string;
        object_id: number;
        owner_id: number;
        updates?: { title?: string; type?: string; private?: boolean };
    };

    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const { object_type, aspect_type, object_id, owner_id } = body;

    // Só nos interessa eventos de atividades
    if (object_type !== "activity") {
        return NextResponse.json({ status: "ignored" });
    }

    // Encontra o user pelo stravaId
    const user = await prisma.user.findUnique({
        where: { stravaId: String(owner_id) },
        select: { id: true },
    });

    if (!user) {
        return NextResponse.json({ status: "user_not_found" });
    }

    console.log(`[webhook] ${aspect_type} activity ${object_id} for user ${user.id}`);

    try {
        if (aspect_type === "create" || aspect_type === "update") {
            // 1. Sync da atividade
            const title = await syncSingleStravaActivity(user.id, object_id);
            console.log(`[webhook] Synced: "${title}"`);

            // 2. Atualiza competições ativas automaticamente
            const competitionsSynced = await syncActiveCompetitionsForUser(user.id);
            console.log(`[webhook] Updated ${competitionsSynced} active competition(s)`);

            return NextResponse.json({ status: "synced", title, competitionsSynced });
        }

        if (aspect_type === "delete") {
            // 1. Remove a atividade
            await deleteStravaActivity(user.id, object_id);
            console.log(`[webhook] Deleted activity ${object_id}`);

            // 2. Recalcula competições (valor pode ter descido)
            const competitionsSynced = await syncActiveCompetitionsForUser(user.id);
            console.log(`[webhook] Recalculated ${competitionsSynced} active competition(s)`);

            return NextResponse.json({ status: "deleted", competitionsSynced });
        }

        return NextResponse.json({ status: "ignored" });
    } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro desconhecido";
        console.error(`[webhook] Erro ao processar atividade ${object_id}:`, msg);
        // Responde 200 mesmo em erro — o Strava tenta reenviar se receber erro
        return NextResponse.json({ status: "error", message: msg });
    }
}