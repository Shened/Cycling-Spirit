import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TeamManageClient from "@/components/team/TeamManageClient";

export default async function TeamManagePage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const { id: teamId } = await params;
    const userId = session.user.id!;

    // Só managers podem aceder
    const member = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId } },
    });

    if (!member || !["owner", "admin"].includes(member.role)) {
        redirect(`/teams`);
    }

    return <TeamManageClient teamId={teamId} currentUserId={userId} currentUserRole={member.role} />;
}