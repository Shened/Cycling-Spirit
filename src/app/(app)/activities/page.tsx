import { auth } from "@/lib/auth";
import ActivitiesClient from "@/components/activity/ActivitiesClient";

export default async function ActivitiesPage() {
  const session = await auth();
  return <ActivitiesClient userId={session!.user!.id!} />;
}
