import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OwnProfileClient from "@/components/profile/OwnProfileClient";

export default async function OwnProfilePage() {
    const session = await auth();
    const userId = session!.user!.id!;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true, name: true, email: true, avatar: true,
            ftpWatts: true, weightKg: true, stravaId: true,
            createdAt: true,
            teamMemberships: {
                select: {
                    role: true,
                    team: { select: { id: true, name: true, slug: true } },
                },
            },
            _count: {
                select: {
                    sentFriendships: { where: { status: "accepted" } },
                    receivedFriendships: { where: { status: "accepted" } },
                },
            },
        },
    });

    return <OwnProfileClient user={user!} />;
}