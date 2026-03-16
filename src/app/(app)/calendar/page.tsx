import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CalendarClient from "@/components/calendar/CalendarClient";

export default async function CalendarPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const teams = await prisma.team.findMany({
    where: { members: { some: { userId } } },
    select: { id: true, name: true },
  });

  return <CalendarClient userId={userId} teams={teams} />;
}
