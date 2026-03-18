// src/app/(app)/activities/[id]/page.tsx

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ActivityDetailClient from "@/components/activity/ActivityDetailClient";

export default async function ActivityDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await auth();
    const userId = session!.user!.id!;
    const { id } = await params;

    const activity = await prisma.activity.findUnique({
        where: { id },
    });

    if (!activity || activity.userId !== userId) notFound();

    return (
        <ActivityDetailClient
            activity={{ ...activity, startedAt: activity.startedAt.toISOString() }}
        />
    );
}