import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { MetaApiError } from "@/lib/metaapi";
import { enableCopyFactoryRole, inspectCopyTradingAccount, LIVE_COPY_ENABLED, updateCopyFactorySubscription } from "@/lib/copy-trading-live";
import { MIVO_PROFIT_SHARE_RATE } from "@/lib/copy-trading-fees";
import { getCopyTradingBrokerConfig } from "@/lib/copy-trading-broker";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to manage live copying." }, { status: 401 });
  if (!LIVE_COPY_ENABLED) return NextResponse.json({ error: "Live copy activation is disabled until Mivo enables its paid MetaApi CopyFactory service." }, { status: 503 });

  let body: { action?: unknown; relationshipId?: unknown; profileId?: unknown; accountId?: unknown; riskPercent?: unknown; consent?: unknown };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid copy action." }, { status: 400 }); }

  const action = body.action;
  if (action === "start") {
    const brokerReferral = getCopyTradingBrokerConfig();
    const profileId = typeof body.profileId === "string" ? body.profileId.trim() : "";
    const accountId = typeof body.accountId === "string" ? body.accountId.trim() : "";
    const riskPercent = Number(body.riskPercent);
    if (body.consent !== true) return NextResponse.json({ error: "Confirm the live-trading and fee terms before starting." }, { status: 400 });
    if (!profileId || !accountId || !Number.isFinite(riskPercent) || riskPercent < 0.1 || riskPercent > 2) {
      return NextResponse.json({ error: "Choose a linked live account and provider. Risk per copied trade must be between 0.1% and 2%." }, { status: 400 });
    }

    try {
      const [profile, account] = await Promise.all([
        prisma.copyTraderProfile.findFirst({ where: { id: profileId, status: "APPROVED", profitSplitVersion: 2, ibVerifiedAt: { not: null }, brokerReferralUrl: brokerReferral.signupUrl, copyFactoryStatus: "ACTIVE", copyFactoryStrategyId: { not: null } } }),
        prisma.copyTradingAccount.findFirst({ where: { id: accountId, userId } }),
      ]);
      if (!profile) return NextResponse.json({ error: "This live provider is unavailable." }, { status: 404 });
      if (profile.userId === userId) return NextResponse.json({ error: "You cannot copy your own provider account." }, { status: 400 });
      if (!account || account.connectionStatus !== "CONNECTED") return NextResponse.json({ error: "Link and verify a real MT5 account before starting." }, { status: 409 });
      const existing = await prisma.liveCopyRelationship.findUnique({ where: { followerId_profileId_accountId: { followerId: userId, profileId, accountId } } });
      if (existing && ["ACTIVE", "PAUSED", "STARTING", "STOPPING"].includes(existing.status)) return NextResponse.json({ error: "This account already has a copy relationship with this provider." }, { status: 409 });

      const { information, region } = await inspectCopyTradingAccount(account.metaApiAccountId);
      if (information.investorMode === true || information.tradeAllowed !== true) return NextResponse.json({ error: "The copier account must have trade-enabled master access. Read-only investor passwords cannot place copied orders." }, { status: 409 });
      if (region !== account.region) return NextResponse.json({ error: "The connected account region changed. Refresh account status before copying." }, { status: 409 });

      const relationship = await prisma.liveCopyRelationship.upsert({
        where: { followerId_profileId_accountId: { followerId: userId, profileId, accountId } },
        create: {
          followerId: userId, profileId, accountId, strategyId: profile.copyFactoryStrategyId!,
          status: "STARTING", riskPercent, copierShareRateAtStart: profile.copierProfitShareRate,
          providerShareRateAtStart: 1 - MIVO_PROFIT_SHARE_RATE - profile.copierProfitShareRate,
          mivoShareRateAtStart: MIVO_PROFIT_SHARE_RATE, profitSplitVersion: 2, consentAt: new Date(),
        },
        update: {
          strategyId: profile.copyFactoryStrategyId!, status: "STARTING", riskPercent,
          copierShareRateAtStart: profile.copierProfitShareRate,
          providerShareRateAtStart: 1 - MIVO_PROFIT_SHARE_RATE - profile.copierProfitShareRate,
          mivoShareRateAtStart: MIVO_PROFIT_SHARE_RATE, profitSplitVersion: 2,
          consentAt: new Date(), startedAt: new Date(), stoppedAt: null, lastError: null,
        },
      });

      try {
        if (!account.copyFactoryEnabled) {
          await enableCopyFactoryRole(account.metaApiAccountId, region, "SUBSCRIBER");
          await prisma.copyTradingAccount.update({ where: { id: account.id }, data: { copyFactoryEnabled: true } });
        }
        await updateCopyFactorySubscription({
          region, accountId: account.metaApiAccountId, accountName: `${account.server} ${account.loginHint}`,
          strategyId: profile.copyFactoryStrategyId!, riskPercent, action: "start",
        });
        await prisma.liveCopyRelationship.update({ where: { id: relationship.id }, data: { status: "ACTIVE", lastError: null } });
        return NextResponse.json({ relationshipId: relationship.id, status: "ACTIVE", message: "Live copying is active on your linked real MT5 account." }, { status: 201 });
      } catch (error) {
        const message = error instanceof Error ? error.message.slice(0, 500) : "CopyFactory could not start this subscription.";
        await prisma.liveCopyRelationship.update({ where: { id: relationship.id }, data: { status: "ERROR", lastError: message } }).catch(() => undefined);
        throw error;
      }
    } catch (error) {
      if (error instanceof MetaApiError) return NextResponse.json({ error: error.message }, { status: error.status });
      console.error("LIVE COPY START ERROR:", error);
      return NextResponse.json({ error: "Unable to start live copying. No confirmation was recorded." }, { status: 500 });
    }
  }

  const relationshipId = typeof body.relationshipId === "string" ? body.relationshipId.trim() : "";
  if (!relationshipId || !["pause", "resume", "stop"].includes(String(action))) {
    return NextResponse.json({ error: "Choose a live copy action." }, { status: 400 });
  }
  const relationshipAction = action as "pause" | "resume" | "stop";

  try {
    const relationship = await prisma.liveCopyRelationship.findFirst({
      where: { id: relationshipId, followerId: userId },
      include: { account: true, profile: { select: { status: true, profitSplitVersion: true, ibVerifiedAt: true, brokerReferralUrl: true, copyFactoryStatus: true } } },
    });
    if (!relationship) return NextResponse.json({ error: "Live copy relationship not found." }, { status: 404 });
    if (relationship.status === "STOPPED") return NextResponse.json({ error: "Stopped relationships cannot be resumed." }, { status: 409 });
    if (relationshipAction === "pause" && relationship.status !== "ACTIVE") return NextResponse.json({ error: "Only active live relationships can be paused." }, { status: 409 });
    if (relationshipAction === "resume" && relationship.status !== "PAUSED") return NextResponse.json({ error: "Only paused live relationships can be resumed." }, { status: 409 });
    if (relationshipAction === "resume" && (relationship.profitSplitVersion !== 2 || relationship.profile.profitSplitVersion !== 2 || !relationship.profile.ibVerifiedAt || relationship.profile.status !== "APPROVED" || relationship.profile.copyFactoryStatus !== "ACTIVE" || relationship.profile.brokerReferralUrl !== getCopyTradingBrokerConfig().signupUrl)) {
      return NextResponse.json({ error: "Review and accept the provider's current profit split before restarting live copying." }, { status: 409 });
    }

    await prisma.liveCopyRelationship.update({ where: { id: relationship.id }, data: { status: relationshipAction === "stop" ? "STOPPING" : relationshipAction === "pause" ? "PAUSING" : "RESUMING", lastError: null } });
    try {
      const { region } = await inspectCopyTradingAccount(relationship.account.metaApiAccountId);
      if (relationshipAction === "stop") {
        await updateCopyFactorySubscription({ region, accountId: relationship.account.metaApiAccountId, accountName: relationship.account.server, strategyId: relationship.strategyId, riskPercent: relationship.riskPercent, action: "stop" });
      } else {
        await updateCopyFactorySubscription({ region, accountId: relationship.account.metaApiAccountId, accountName: relationship.account.server, strategyId: relationship.strategyId, riskPercent: relationship.riskPercent, action: relationshipAction });
      }
      const status = relationshipAction === "stop" ? "STOPPED" : relationshipAction === "pause" ? "PAUSED" : "ACTIVE";
      await prisma.liveCopyRelationship.update({ where: { id: relationship.id }, data: { status, stoppedAt: relationshipAction === "stop" ? new Date() : null, lastError: null } });
      return NextResponse.json({ status, message: relationshipAction === "pause" ? "New entries are paused; copied positions can still receive provider close signals." : relationshipAction === "stop" ? "New entries stopped. Existing positions will close according to the provider’s graceful-exit settings." : "Live copying resumed." });
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 500) : "CopyFactory could not update this relationship.";
      await prisma.liveCopyRelationship.update({ where: { id: relationship.id }, data: { status: "ERROR", lastError: message } }).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    if (error instanceof MetaApiError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("LIVE COPY CONTROL ERROR:", error);
    return NextResponse.json({ error: "Unable to update this live copy relationship." }, { status: 500 });
  }
}
