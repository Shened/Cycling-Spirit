import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TeamsClient from "@/components/team/TeamsClient";

export default async function TeamsPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const teams = await prisma.team.findMany({
    where: { members: { some: { userId } } },
    select: {
      id: true, name: true, slug: true, description: true,
      logo: true, ownerId: true,
      owner: { select: { id: true, name: true, email: true, avatar: true } },
      members: {
        select: {
          userId: true, role: true, joinedAt: true,
          user: { select: { id: true, name: true, email: true, avatar: true } },
        },
      },
    },
  });

  return <TeamsClient userId={userId} initialTeams={teams as never} />;
}
