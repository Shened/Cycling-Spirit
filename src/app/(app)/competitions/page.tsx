import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CompetitionsClient from "@/components/competition/CompetitionsClient";

export default async function CompetitionsPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const teams = await prisma.team.findMany({
    where: { members: { some: { userId } } },
    select: {
      id: true,
      name: true,
      ownerId: true,
      members: { select: { userId: true, role: true } },
    },
  });

  return <CompetitionsClient userId={userId} teams={teams} />;
}
