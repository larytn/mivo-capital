import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { getMt5ConnectionForUser } from "@/lib/mt5-db";
import { createOrUpdateProviderStrategy, enableCopyFactoryRole, inspectCopyTradingAccount, LIVE_COPY_ENABLED } from "@/lib/copy-trading-live";
import { MetaApiError } from "@/lib/metaapi";
import { getCopyTradingBrokerConfig } from "@/lib/copy-trading-broker";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to activate your provider account." }, { status: 401 });
  if (!LIVE_COPY_ENABLED) return NextResponse.json({ error: "Live copy activation is disabled until Mivo enables its paid MetaApi CopyFactory service." }, { status: 503 });
  try {
    const body = await request.json() as { consent?: unknown };
    if (body.consent !== true) return NextResponse.json({ error: "Confirm the live publishing and MetaApi service disclosure before activation." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Confirm the live publishing and MetaApi service disclosure before activation." }, { status: 400 });
  }

  try {
    const profile = await prisma.copyTraderProfile.findUnique({ where: { userId } });
    if (!profile || profile.status !== "APPROVED") return NextResponse.json({ error: "Your provider profile must be approved before live activation." }, { status: 409 });
    if (!profile.ibVerifiedAt || !profile.brokerReferralConfirmedAt || profile.brokerReferralUrl !== getCopyTradingBrokerConfig().signupUrl) return NextResponse.json({ error: "Mivo must verify that your connected provider account is registered under its broker IB program before live activation." }, { status: 409 });
    if (profile.profitSplitVersion !== 2) return NextResponse.json({ error: "Review and submit the updated copier profit share terms before enabling this strategy." }, { status: 409 });
    if (!profile.providerAccountId || !profile.providerBrokerConnectionId) return NextResponse.json({ error: "Connect a real MT5 provider account in MT5 Journal Sync, then resubmit your application." }, { status: 409 });
    const connection = await getMt5ConnectionForUser(userId);
    if (!connection || connection.id !== profile.providerBrokerConnectionId || connection.providerAccountId !== profile.providerAccountId) {
      return NextResponse.json({ error: "The approved provider account is no longer connected. Reconnect it and ask Mivo to review the profile again." }, { status: 409 });
    }
    const { account, information, region } = await inspectCopyTradingAccount(profile.providerAccountId);
    if (information.investorMode !== true) return NextResponse.json({ error: "Keep the provider source connected with the read-only investor password." }, { status: 409 });
    if (!profile.brokerAccountLogin || !profile.brokerServer || String(information.login ?? "").trim() !== profile.brokerAccountLogin || (information.server && information.server !== profile.brokerServer)) {
      return NextResponse.json({ error: "The connected broker account no longer matches the Mivo IB verification. Reconnect the verified account and ask Mivo to review it again." }, { status: 409 });
    }

    await prisma.copyTraderProfile.update({ where: { id: profile.id }, data: { copyFactoryStatus: "ACTIVATING" } });
    if (profile.copyFactoryStatus !== "ACCOUNT_ENABLED" && profile.copyFactoryStatus !== "ACTIVE") {
      await enableCopyFactoryRole(profile.providerAccountId, region, "PROVIDER");
      await prisma.copyTraderProfile.update({ where: { id: profile.id }, data: { copyFactoryStatus: "ACCOUNT_ENABLED" } });
    }
    const strategyId = await createOrUpdateProviderStrategy({
      region,
      strategyId: profile.copyFactoryStrategyId,
      accountId: profile.providerAccountId,
      name: `Mivo provider ${profile.id.slice(-8)}`,
      description: `${profile.strategy}\nMarkets: ${profile.markets}`,
      copierProfitShareRate: profile.copierProfitShareRate,
    });
    await prisma.copyTraderProfile.update({ where: { id: profile.id }, data: { providerRegion: region, copyFactoryStrategyId: strategyId, copyFactoryStatus: "ACTIVE" } });
    return NextResponse.json({ activated: true, providerAccount: { server: information.server || connection.server, loginHint: information.login ? `••••${String(information.login).slice(-4)}` : null, platform: account.platform }, message: "Your live strategy is connected and can accept followers." });
  } catch (error) {
    if (error instanceof MetaApiError) {
      await prisma.copyTraderProfile.updateMany({ where: { userId, copyFactoryStatus: "ACTIVATING" }, data: { copyFactoryStatus: "FAILED" } }).catch(() => undefined);
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("COPY PROVIDER LIVE ACTIVATION ERROR:", error);
    await prisma.copyTraderProfile.updateMany({ where: { userId, copyFactoryStatus: "ACTIVATING" }, data: { copyFactoryStatus: "FAILED" } }).catch(() => undefined);
    return NextResponse.json({ error: "Unable to activate live provider copying." }, { status: 500 });
  }
}
