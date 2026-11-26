import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { MetaApiError } from "@/lib/metaapi";
import { getMt5DatabaseIssueMessage } from "@/lib/mt5-db";
import { syncMt5ConnectionForUser } from "@/lib/mt5-sync";
import { getVipAccess } from "@/lib/vip-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Sign in to sync your MT5 journal." }, { status: 401 });
  }

  try {
    const membership = await getVipAccess(userId);
    if (!membership) return NextResponse.json({ error: "Member account not found." }, { status: 401 });
    if (!membership.active) {
      return NextResponse.json(
        { error: "Mivo Pro membership is required for automated MT5 journaling.", code: "VIP_REQUIRED" },
        { status: 403 },
      );
    }

    const result = await syncMt5ConnectionForUser(userId);
    return NextResponse.json(result);
  } catch (error) {
    const databaseMessage = getMt5DatabaseIssueMessage(error);
    if (databaseMessage) {
      return NextResponse.json({ error: databaseMessage }, { status: 503 });
    }
    if (error instanceof MetaApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("MT5 MANUAL SYNC ERROR:", error);
    return NextResponse.json({ error: "Could not sync MT5 trades right now." }, { status: 502 });
  }
}
