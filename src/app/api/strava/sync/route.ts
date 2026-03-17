import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncStravaActivities, syncStravaKoms, syncPersonalRecords } from "@/lib/strava";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const [activities, koms] = await Promise.all([
      syncStravaActivities(session.user.id),
      syncStravaKoms(session.user.id),
    ]);

    // Atualiza records após sync das atividades
    await syncPersonalRecords(session.user.id);

    return NextResponse.json({
      message: `${activities} atividades e ${koms} KOMs/Top10 sincronizados`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}