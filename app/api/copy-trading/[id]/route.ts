import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { providerPerformanceWithCurve } from "@/lib/copy-trading-performance";
import { LIVE_COPY_ENABLED } from "@/lib/copy-trading-live";
import { getCopyTradingBrokerConfig } from "@/lib/copy-trading-broker";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const { id } = await params;
    const brokerReferral = getCopyTradingBrokerConfig();
    const profile = await prisma.copyTraderProfile.findFirst({
      where: { id, status: "APPROVED", profitSplitVersion: 2, ibVerifiedAt: { not: null }, brokerReferralUrl: brokerReferral.signupUrl, copyFactoryStatus: "ACTIVE", copyFactoryStrategyId: { not: null } },
      select: {
        id: true, userId: true, bio: true, strategy: true, markets: true, createdAt: true,
        copierProfitShareRate: true,
        user: { select: {
          name: true,
          journalTrades: { where: { isPublic: true }, orderBy: { openedAt: "desc" }, take: 1000, select: {
            id: true, symbol: true, direction: true, status: true, entryPrice: true,
            exitPrice: true, stopLoss: true, takeProfit: true, currentPrice: true,
            openedAt: true, closedAt: true, isPublic: true,
          } },
        } },
        _count: { select: { liveFollowers: { where: { status: { in: ["ACTIVE", "PAUSED"] } } } } },
      },
    });
    if (!profile) return NextResponse.json({ error: "Live approved provider not found." }, { status: 404 });
    const { user, _count, ...publicProfile } = profile;
    const trades = user.journalTrades.map((trade) => ({
      id: trade.id, symbol: trade.symbol, direction: trade.direction, status: trade.status,
      entryPrice: trade.entryPrice, exitPrice: trade.exitPrice, stopLoss: trade.stopLoss,
      takeProfit: trade.takeProfit, currentPrice: trade.currentPrice,
      openedAt: trade.openedAt, closedAt: trade.closedAt,
    }));
    const [performance, relationship, accounts] = await Promise.all([
      providerPerformanceWithCurve(profile.userId),
      profile.userId === userId ? null : prisma.liveCopyRelationship.findFirst({
        where: { followerId: userId, profileId: id }, orderBy: { createdAt: "desc" },
        select: { id: true, status: true, accountId: true, riskPercent: true },
      }),
      prisma.copyTradingAccount.findMany({ where: { userId, connectionStatus: "CONNECTED" }, orderBy: { createdAt: "desc" }, select: {
        id: true, server: true, loginHint: true, accountCurrency: true, balance: true, equity: true,
      } }),
    ]);
    return NextResponse.json({
      profile: { ...publicProfile, name: user.name, followerCount: _count.liveFollowers },
      performance, trades, relationship, accounts, liveCopyEnabled: LIVE_COPY_ENABLED,
    }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    console.error("COPY TRADING PROFILE GET ERROR:", error);
    return NextResponse.json({ error: "Unable to load this provider profile." }, { status: 500 });
  }
}
