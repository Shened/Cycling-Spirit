import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exchangeStravaCode, syncStravaActivities } from "@/lib/strava";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const userId = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !userId) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?strava=error`);
  }

  try {
    const data = await exchangeStravaCode(code);

    await prisma.user.update({
      where: { id: userId },
      data: {
        stravaId: String(data.athlete.id),
        stravaAccessToken: data.access_token,
        stravaRefreshToken: data.refresh_token,
        stravaTokenExpiresAt: new Date(data.expires_at * 1000),
        avatar: data.athlete.profile_medium ?? undefined,
      },
    });

    // Sync activities since start of year
    await syncStravaActivities(userId);

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?strava=connected`);
  } catch (err) {
    console.error("Strava callback error:", err);
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?strava=error`);
  }
}
