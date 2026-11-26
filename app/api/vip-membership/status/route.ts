import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { getVipAccess } from "@/lib/vip-access";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to check membership." }, { status: 401 });

  try {
    const membership = await getVipAccess(userId);
    if (!membership) return NextResponse.json({ error: "Member account not found." }, { status: 401 });
    return NextResponse.json(
      { hasVipAccess: membership.active },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("VIP MEMBERSHIP STATUS ERROR:", error);
    return NextResponse.json({ error: "Unable to check VIP membership right now." }, { status: 503 });
  }
}
