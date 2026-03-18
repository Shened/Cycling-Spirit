// src/app/(app)/training-zones/page.tsx
// Substitui o ficheiro existente

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TrainingZonesClient from "@/components/training/TrainingZonesClient";

export default async function TrainingZonesPage() {
    const session = await auth();
    const userId = session!.user!.id!;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            ftpWatts: true,
            weightKg: true,
            hrZones: true,
        },
    });

    // Estima FC máxima das atividades recentes (para sugestão inicial)
    const recentActivities = await prisma.activity.findMany({
        where: { userId, avgHeartRate: { not: null } },
        orderBy: { startedAt: "desc" },
        take: 20,
        select: { avgHeartRate: true },
    });

    const estimatedMaxHR = recentActivities.length > 0
        ? Math.round(Math.max(...recentActivities.map((a) => a.avgHeartRate!)) * 1.15)
        : null;

    return (
        <TrainingZonesClient
            user={user!}
            estimatedMaxHR={estimatedMaxHR}
        />
    );
}