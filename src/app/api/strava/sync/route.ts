import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncStravaActivities } from "@/lib/strava";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const count = await syncStravaActivities(session.user.id);
    return NextResponse.json({ message: `${count} atividades sincronizadas` });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
