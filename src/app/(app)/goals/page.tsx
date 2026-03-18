// src/app/(app)/goals/page.tsx

import { auth } from "@/lib/auth";
import GoalsClient from "@/components/goals/GoalsClient";

export default async function GoalsPage() {
    const session = await auth();
    const userId = session!.user!.id!;

    return <GoalsClient userId={userId} />;
}