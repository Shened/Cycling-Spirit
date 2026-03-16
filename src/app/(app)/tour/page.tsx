import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TourListClient from "@/components/tour/TourListClient";

export default async function TourPage() {
    const session = await auth();
    const userId = session!.user!.id!;

    const teams = await prisma.team.findMany({
        where: { members: { some: { userId } } },
        select: { id: true, name: true },
    });

    // Utilizadores da app para convidar
    const users = await prisma.user.findMany({
        where: { id: { not: userId } },
        select: { id: true, name: true, avatar: true },
        take: 100,
    });

    return <TourListClient userId={userId} teams={teams} allUsers={users} />;
}