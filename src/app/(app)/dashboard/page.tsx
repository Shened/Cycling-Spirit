import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DashboardClient from "@/components/dashboard/DashboardClient";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, email: true, avatar: true,
      ftpWatts: true, weightKg: true, stravaId: true,
      dashboardWidgets: true,
      teamMemberships: {
        select: {
          team: { select: { id: true, name: true } },
        },
      },
    },
  });

  return <DashboardClient user={user!} />;
}
