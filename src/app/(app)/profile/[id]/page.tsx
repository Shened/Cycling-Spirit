import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ProfileClient from "@/components/profile/ProfileClient";
export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const { id } = await params;

    // Se for o próprio utilizador, redireciona para as definições
    if (id === session.user.id) redirect("/settings");

    return <ProfileClient userId={id} currentUserId={session.user.id} />;
}