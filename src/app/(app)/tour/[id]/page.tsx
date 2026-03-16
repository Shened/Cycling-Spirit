import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import TourDetailClient from "@/components/tour/TourDetailClient";

export default async function TourDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user) redirect("/login");
    const { id } = await params;
    return <TourDetailClient tourId={id} currentUserId={session.user.id!} />;
}