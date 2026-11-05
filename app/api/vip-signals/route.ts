import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to view VIP Signals." }, { status: 401 });

  try {
    const member = await prisma.user.findUnique({ where: { id: userId }, select: { isVip: true, role: true } });
    if (!member) return NextResponse.json({ error: "Member account not found." }, { status: 401 });
    if (!member.isVip && member.role !== "ADMIN") return NextResponse.json({ error: "VIP membership is required to view this area.", code: "VIP_REQUIRED" }, { status: 403 });

    const signals = await prisma.vipSignal.findMany({
      orderBy: [{ status: "asc" }, { publishedAt: "desc" }],
      take: 100,
      select: {
        id: true, symbol: true, side: true, timeframe: true, entryLow: true, entryHigh: true,
        stopLoss: true, takeProfits: true, thesis: true, status: true, outcomeNote: true,
        publishedAt: true, closedAt: true, createdBy: { select: { name: true } },
      },
    });
    return NextResponse.json({ signals }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    console.error("VIP SIGNALS GET ERROR:", error);
    return NextResponse.json({ error: "Unable to load VIP Signals right now." }, { status: 500 });
  }
}
