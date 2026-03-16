import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SettingsClient from "@/components/settings/SettingsClient";

export default async function SettingsPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, email: true, avatar: true,
      ftpWatts: true, weightKg: true, stravaId: true,
    },
  });

  return <SettingsClient user={user!} />;
}
