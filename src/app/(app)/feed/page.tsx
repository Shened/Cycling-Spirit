// src/app/(app)/feed/page.tsx

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import FeedClient from "@/components/feed/FeedClient";

export default async function FeedPage() {
    const session = await auth();
    const userId = session!.user!.id!;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, avatar: true },
    });

    return <FeedClient currentUser={user!} />;
}