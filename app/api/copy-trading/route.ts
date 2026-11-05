import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { providerPerformanceForUsers } from "@/lib/copy-trading-performance";
import { getMt5ConnectionForUser } from "@/lib/mt5-db";
import { inspectCopyTradingAccount, LIVE_COPY_ENABLED } from "@/lib/copy-trading-live";
import { MetaApiError } from "@/lib/metaapi";
import { getCopyTradingBrokerConfig } from "@/lib/copy-trading-broker";

export const dynamic = "force-dynamic";

const tradeSelect = {
  id: true, symbol: true, direction: true, status: true, entryPrice: true,
  exitPrice: true, stopLoss: true, takeProfit: true, currentPrice: true,
  openedAt: true, closedAt: true,
} as const;
const emptyPerformance = { verified: false, sourceLabel: "No verified broker history", netPnl: null, maxDrawdown: null, winRate: null, profitFactor: null, profitFactorInfinite: false, totalTrades: null, curve: [], lastSyncedAt: null };

function safeUrl(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || value.length > 500) return undefined;
  try { return new URL(value).protocol === "https:" ? value : undefined; }
  catch { return undefined; }
}

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const brokerReferral = getCopyTradingBrokerConfig();
    const [profiles, myProfileRaw, accounts, relationships] = await Promise.all([
      prisma.copyTraderProfile.findMany({
        where: { status: "APPROVED", profitSplitVersion: 2, ibVerifiedAt: { not: null }, brokerReferralUrl: brokerReferral.signupUrl, copyFactoryStatus: "ACTIVE", copyFactoryStrategyId: { not: null } },
        orderBy: { createdAt: "desc" }, take: 100,
        select: {
          id: true, userId: true, bio: true, strategy: true, markets: true, createdAt: true,
          copierProfitShareRate: true,
          user: { select: {
            name: true,
            journalTrades: { where: { isPublic: true }, orderBy: { openedAt: "desc" }, take: 5, select: tradeSelect },
          } },
          _count: { select: { liveFollowers: { where: { status: { in: ["ACTIVE", "PAUSED"] } } } } },
        },
      }),
      prisma.copyTraderProfile.findUnique({ where: { userId }, select: {
        id: true, userId: true, bio: true, strategy: true, markets: true, evidenceUrl: true, status: true,
        reviewFeedback: true, createdAt: true, reviewedAt: true, copierProfitShareRate: true, profitSplitVersion: true,
        brokerReferralConfirmedAt: true, brokerReferralUrl: true, ibVerifiedAt: true,
        providerAccountId: true, copyFactoryStrategyId: true, copyFactoryStatus: true,
        user: { select: { _count: { select: { liveCopyRelationships: { where: { status: { in: ["ACTIVE", "PAUSED"] } } } } } } },
      } }),
      prisma.copyTradingAccount.findMany({
        where: { userId }, orderBy: { createdAt: "desc" },
        select: { id: true, server: true, loginHint: true, accountCurrency: true, balance: true, equity: true, tradeMode: true, marginMode: true, connectionStatus: true, copyFactoryEnabled: true, createdAt: true },
      }),
      prisma.liveCopyRelationship.findMany({
        where: { followerId: userId }, orderBy: { updatedAt: "desc" }, take: 100,
        include: {
          account: { select: { id: true, server: true, loginHint: true, accountCurrency: true, balance: true, equity: true, connectionStatus: true } },
          profile: { select: { id: true, status: true, profitSplitVersion: true, copyFactoryStatus: true, copierProfitShareRate: true, user: { select: { name: true } } } },
        },
      }),
    ]);

    const performanceByUser = await providerPerformanceForUsers([
      ...profiles.map((profile) => profile.userId), ...(myProfileRaw ? [myProfileRaw.userId] : []),
    ]);
    const directory = profiles.map(({ _count, user, ...profile }) => ({
      ...profile,
      isOwn: profile.userId === userId,
      followerCount: _count.liveFollowers,
      performance: performanceByUser.get(profile.userId) ?? emptyPerformance,
      user: { name: user.name, journalTrades: user.journalTrades },
    }));
    const myProfile = myProfileRaw ? {
      id: myProfileRaw.id, bio: myProfileRaw.bio, strategy: myProfileRaw.strategy,
      markets: myProfileRaw.markets, evidenceUrl: myProfileRaw.evidenceUrl,
      status: myProfileRaw.status, reviewFeedback: myProfileRaw.reviewFeedback,
      createdAt: myProfileRaw.createdAt, reviewedAt: myProfileRaw.reviewedAt,
      copierProfitShareRate: myProfileRaw.copierProfitShareRate,
      profitSplitVersion: myProfileRaw.profitSplitVersion,
      brokerReferralConfirmedAt: myProfileRaw.brokerReferralConfirmedAt,
      brokerReferralUrl: myProfileRaw.brokerReferralUrl,
      ibVerifiedAt: myProfileRaw.ibVerifiedAt,
      providerAccountLinked: Boolean(myProfileRaw.providerAccountId),
      copyFactoryStrategyId: myProfileRaw.copyFactoryStrategyId,
      copyFactoryStatus: myProfileRaw.copyFactoryStatus,
      performance: performanceByUser.get(myProfileRaw.userId) ?? emptyPerformance,
      followerCount: myProfileRaw.user._count.liveCopyRelationships,
    } : null;

    return NextResponse.json({ profiles: directory, myProfile, accounts, relationships, liveCopyEnabled: LIVE_COPY_ENABLED, brokerReferral }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    console.error("COPY TRADING GET ERROR:", error);
    return NextResponse.json({ error: "Unable to load copy trading right now." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  try {
    const body = await request.json();
    if (body.action !== "apply") {
      return NextResponse.json({ error: "Paper-copy actions have been retired. Link a real MT5 account in My Copy Trading to use live copy features." }, { status: 410 });
    }
    const bio = typeof body.bio === "string" ? body.bio.trim() : "";
    const strategy = typeof body.strategy === "string" ? body.strategy.trim() : "";
    const markets = typeof body.markets === "string" ? body.markets.trim() : "";
    const evidenceUrl = safeUrl(body.evidenceUrl);
    const copierProfitShareRate = Number(body.copierProfitShareRate);
    const brokerReferral = getCopyTradingBrokerConfig();
    if (!brokerReferral.signupUrl) return NextResponse.json({ error: "Mivo’s broker registration link is not configured yet. Contact Mivo before submitting a provider application." }, { status: 503 });
    if (body.brokerReferralConfirmed !== true) return NextResponse.json({ error: "Confirm that you created this provider account through Mivo’s broker registration link." }, { status: 400 });
    if (body.consent !== true) return NextResponse.json({ error: "Confirm the provider and live-trade disclosure before applying." }, { status: 400 });
    if (evidenceUrl === undefined) return NextResponse.json({ error: "Supporting evidence must be a valid HTTPS link." }, { status: 400 });
    if (bio.length < 30 || bio.length > 1200 || strategy.length < 20 || strategy.length > 1200 || markets.length < 2 || markets.length > 160) {
      return NextResponse.json({ error: "Add a bio, strategy description, and the markets you trade." }, { status: 400 });
    }
    if (!Number.isFinite(copierProfitShareRate) || copierProfitShareRate < 0 || copierProfitShareRate > 0.9) {
      return NextResponse.json({ error: "The copier's profit share must be between 0% and 90% of eligible profit." }, { status: 400 });
    }

    const connection = await getMt5ConnectionForUser(userId);
    if (!connection || connection.status !== "CONNECTED") {
      return NextResponse.json({ error: "Connect your real provider MT5 account with the read-only investor password in MT5 Journal Sync before applying." }, { status: 409 });
    }
    const { account, information } = await inspectCopyTradingAccount(connection.providerAccountId);
    if (information.investorMode !== true) {
      return NextResponse.json({ error: "Provider source accounts must use MetaApi investor/read-only access. Disconnect this account and reconnect it with the investor password." }, { status: 409 });
    }
    const brokerAccountLogin = information.login == null ? "" : String(information.login).trim();
    if (!brokerAccountLogin) return NextResponse.json({ error: "Mivo needs the linked broker account number to verify its IB registration. Reconnect the account or contact support." }, { status: 409 });
    const brokerServer = typeof information.server === "string" && information.server.trim() ? information.server.trim() : connection.server;

    const prior = await prisma.copyTraderProfile.findUnique({ where: { userId }, select: { id: true, status: true } });
    const activeFollows = prior ? await prisma.liveCopyRelationship.count({ where: { profileId: prior.id, status: { in: ["ACTIVE", "PAUSED"] } } }) : 0;
    if (activeFollows > 0) return NextResponse.json({ error: "Stop all active or paused live relationships before changing an approved provider profile. Existing copiers keep the terms they accepted." }, { status: 409 });
    if (prior?.status === "REVOKED" || prior?.status === "SUSPENDED") return NextResponse.json({ error: "This provider profile is suspended or revoked. Contact Mivo support before reapplying." }, { status: 409 });

    const profile = await prisma.copyTraderProfile.upsert({
      where: { userId },
      create: {
        userId, bio, strategy, markets, evidenceUrl, status: "PENDING", consentAt: new Date(),
        brokerReferralConfirmedAt: new Date(), brokerReferralUrl: brokerReferral.signupUrl,
        brokerAccountLogin, brokerServer, ibVerifiedAt: null, ibVerificationReference: null,
        providerBrokerConnectionId: connection.id, providerAccountId: connection.providerAccountId,
        copierProfitShareRate, profitSplitVersion: 2, copyFactoryStatus: "NOT_ENABLED",
      },
      update: {
        bio, strategy, markets, evidenceUrl, status: "PENDING", reviewFeedback: null, consentAt: new Date(),
        brokerReferralConfirmedAt: new Date(), brokerReferralUrl: brokerReferral.signupUrl,
        brokerAccountLogin, brokerServer, ibVerifiedAt: null, ibVerificationReference: null,
        providerBrokerConnectionId: connection.id, providerAccountId: connection.providerAccountId,
        copierProfitShareRate, profitSplitVersion: 2,
        ...(prior?.status === "APPROVED" ? { copyFactoryStatus: "NOT_ENABLED" } : {}),
      },
      select: { id: true, bio: true, strategy: true, markets: true, status: true, copierProfitShareRate: true, profitSplitVersion: true, copyFactoryStatus: true },
    });
    return NextResponse.json({ profile, linkedAccount: { server: brokerServer, login: `••••${brokerAccountLogin.slice(-4)}`, platform: account.platform }, message: "Provider application submitted. Mivo will verify that this connected real MT5 account is registered under Mivo’s broker IB program before approval." }, { status: 201 });
  } catch (error) {
    if (error instanceof MetaApiError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("COPY TRADING APPLICATION ERROR:", error);
    return NextResponse.json({ error: "Unable to save this provider application." }, { status: 500 });
  }
}
