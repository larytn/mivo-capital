import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { databaseErrorMessage } from "@/lib/database-error";

export const dynamic = "force-dynamic";

function getUserId(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) return null;
  const payload = verifyToken(token) as { id?: string; userId?: string } | null;
  return payload?.id || payload?.userId || null;
}

export async function GET(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [profile, trades, posts] = await Promise.allSettled([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    prisma.journalTrade.findMany({
      where: { userId },
      orderBy: { openedAt: "desc" },
      select: {
        id: true,
        symbol: true,
        direction: true,
        status: true,
        pnl: true,
        fees: true,
        openedAt: true,
        closedAt: true,
      },
    }),
    prisma.communityPost.findMany({
      where: { moderationStatus: "APPROVED" },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      take: 4,
      select: {
        id: true,
        title: true,
        content: true,
        category: true,
        createdAt: true,
        author: { select: { name: true } },
        _count: { select: { likes: true, comments: true } },
      },
    }),
  ]);

  const failures: string[] = [];
  if (profile.status === "rejected" || !profile.value) {
    const error = profile.status === "rejected" ? profile.reason : null;
    console.error("DASHBOARD PROFILE ERROR:", error || "User not found");
    return NextResponse.json(
      { error: databaseErrorMessage(error, "Overview") },
      { status: profile.status === "fulfilled" ? 404 : 503 },
    );
  }

  if (trades.status === "rejected") {
    console.error("DASHBOARD JOURNAL ERROR:", trades.reason);
    failures.push(databaseErrorMessage(trades.reason, "Journal"));
  }
  if (posts.status === "rejected") {
    console.error("DASHBOARD COMMUNITY ERROR:", posts.reason);
    failures.push(databaseErrorMessage(posts.reason, "Community feed"));
  }
  return NextResponse.json(
    {
      profile: profile.value,
      trades: trades.status === "fulfilled" ? trades.value : [],
      posts:
        posts.status === "fulfilled"
          ? posts.value.map((post) => ({
              ...post,
              likesCount: post._count.likes,
              commentsCount: post._count.comments,
            }))
          : [],
      errors: failures,
    },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
