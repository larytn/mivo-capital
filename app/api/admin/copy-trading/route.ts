import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { providerPerformanceForUsers } from "@/lib/copy-trading-performance";
import { getMt5ConnectionForUser } from "@/lib/mt5-db";
import { MetaApiError } from "@/lib/metaapi";
import { inspectCopyTradingAccount, updateCopyFactorySubscription } from "@/lib/copy-trading-live";
import { getCopyTradingBrokerConfig } from "@/lib/copy-trading-broker";

export const dynamic = "force-dynamic";

const assessmentKeys = ["experience", "consistency", "drawdown", "riskManagement", "behavior", "supportingEvidence", "strategy", "ibReferralVerified"] as const;

async function getAdminId() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return null;
  const admin = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
  return admin?.role === "ADMIN" ? admin.id : null;
}

export async function GET() {
  const adminId = await getAdminId();
  if (!adminId) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  try {
    const [profiles, audit] = await Promise.all([
      prisma.copyTraderProfile.findMany({
        orderBy: { createdAt: "desc" }, take: 200,
        include: {
          user: { select: { name: true, email: true } },
          _count: { select: { liveFollowers: { where: { status: { in: ["ACTIVE", "PAUSED", "STARTING", "STOPPING", "ERROR"] } } } } },
        },
      }),
      prisma.copyTradingAudit.findMany({
        orderBy: { createdAt: "desc" }, take: 100,
        include: {
          admin: { select: { name: true } },
          profile: { select: { user: { select: { name: true, email: true } } } },
        },
      }),
    ]);
    const metrics = await providerPerformanceForUsers(profiles.map((profile) => profile.userId));
    const data = profiles.map(({ user, ...profile }) => ({
      ...profile,
      applicant: user,
      performance: metrics.get(profile.userId) ?? {
        verified: false, netPnl: null, maxDrawdown: null, winRate: null,
        profitFactor: null, profitFactorInfinite: false, totalTrades: null, lastSyncedAt: null,
      },
      _count: { followers: profile._count.liveFollowers },
    }));
    return NextResponse.json({ profiles: data, audit }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    console.error("ADMIN COPY TRADING GET ERROR:", error);
    return NextResponse.json({ error: "Unable to load provider assessments." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const adminId = await getAdminId();
  if (!adminId) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  try {
    const body = await request.json() as { id?: unknown; action?: unknown; notes?: unknown; assessment?: unknown };
    const id = typeof body.id === "string" ? body.id.trim() : "";
    const action = typeof body.action === "string" ? body.action : "";
    const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : "";
    const assessment = body.assessment && typeof body.assessment === "object" && !Array.isArray(body.assessment)
      ? body.assessment as Record<string, unknown>
      : {};
    const ibVerificationReference = typeof assessment.ibVerificationReference === "string" ? assessment.ibVerificationReference.trim().slice(0, 200) : "";
    if (!id || !["approve", "request_info", "reject", "suspend", "reinstate", "revoke"].includes(action)) {
      return NextResponse.json({ error: "Choose a provider and a valid review action." }, { status: 400 });
    }
    if (notes.length < 5) return NextResponse.json({ error: "Enter a review note of at least five characters." }, { status: 400 });
    if (action === "approve" && !assessmentKeys.every((key) => assessment[key] === true)) {
      return NextResponse.json({ error: "Complete every provider assessment item before approval." }, { status: 400 });
    }
    if (action === "approve" && ibVerificationReference.length < 4) {
      return NextResponse.json({ error: "Record the broker portal reference used to confirm this account’s Mivo IB registration." }, { status: 400 });
    }

    const profile = await prisma.copyTraderProfile.findUnique({ where: { id }, select: { id: true, userId: true, status: true, profitSplitVersion: true, brokerReferralConfirmedAt: true, brokerReferralUrl: true, brokerAccountLogin: true, brokerServer: true, providerBrokerConnectionId: true, providerAccountId: true } });
    if (!profile) return NextResponse.json({ error: "Provider application not found." }, { status: 404 });
    if (action === "approve" && profile.profitSplitVersion !== 2) return NextResponse.json({ error: "The provider must accept and submit the updated profit split before approval." }, { status: 409 });
    const configuredReferralUrl = getCopyTradingBrokerConfig().signupUrl;
    if (action === "approve" && (!configuredReferralUrl || !profile.brokerReferralConfirmedAt || !profile.brokerAccountLogin || !profile.brokerServer || profile.brokerReferralUrl !== configuredReferralUrl)) {
      return NextResponse.json({ error: "The provider must submit a real account through Mivo’s configured broker referral link before approval." }, { status: 409 });
    }
    const allowed = action === "approve" || action === "request_info" || action === "reject"
      ? ["PENDING", "NEEDS_INFO"].includes(profile.status)
      : action === "suspend" ? profile.status === "APPROVED"
        : action === "reinstate" ? profile.status === "SUSPENDED"
          : ["APPROVED", "SUSPENDED"].includes(profile.status);
    if (!allowed) return NextResponse.json({ error: "This provider status has changed. Reload the review before deciding." }, { status: 409 });

    if (action === "approve") {
      const connection = await getMt5ConnectionForUser(profile.userId);
      if (!connection || connection.status !== "CONNECTED" || connection.id !== profile.providerBrokerConnectionId || connection.providerAccountId !== profile.providerAccountId || !profile.providerAccountId) {
        return NextResponse.json({ error: "The provider’s submitted MT5 account is no longer connected. Ask them to reconnect it and resubmit before approval." }, { status: 409 });
      }
      const { information } = await inspectCopyTradingAccount(profile.providerAccountId);
      const currentLogin = String(information.login ?? "").trim();
      const currentServer = information.server?.trim() || connection.server;
      if (information.investorMode !== true || currentLogin !== profile.brokerAccountLogin || currentServer !== profile.brokerServer) {
        return NextResponse.json({ error: "The connected real MT5 account does not match the account reviewed for Mivo IB registration. Ask the provider to reconnect and resubmit." }, { status: 409 });
      }
    }

    const status = action === "approve" || action === "reinstate" ? "APPROVED"
      : action === "request_info" ? "NEEDS_INFO"
        : action === "reject" ? "REJECTED"
          : action === "suspend" ? "SUSPENDED" : "REVOKED";
    const mustPauseFollowers = status === "SUSPENDED" || status === "REVOKED";

    await prisma.$transaction([
      prisma.copyTraderProfile.update({ where: { id }, data: {
        status,
        reviewFeedback: notes,
        reviewedAt: new Date(),
        ...(action === "approve" ? { verifiedAt: new Date(), ibVerifiedAt: new Date(), ibVerificationReference } : {}),
      } }),
      prisma.copyTradingAudit.create({ data: {
        adminId, profileId: id, action: action.toUpperCase(), notes,
        assessment: action === "approve" ? { ...assessment, ibVerificationReference } : undefined,
      } }),
    ]);

    let pausedCount = 0;
    const pauseFailures: Array<{ relationshipId: string; message: string }> = [];
    if (mustPauseFollowers) {
      const relationships = await prisma.liveCopyRelationship.findMany({
        where: { profileId: id, status: { in: ["ACTIVE", "STARTING", "RESUMING", "PAUSING", "STOPPING", "ERROR"] } },
        include: { account: { select: { metaApiAccountId: true, region: true, server: true, loginHint: true } } },
      });
      for (const relationship of relationships) {
        await prisma.liveCopyRelationship.update({ where: { id: relationship.id }, data: { status: "PAUSING", lastError: null } });
        try {
          await updateCopyFactorySubscription({
            region: relationship.account.region,
            accountId: relationship.account.metaApiAccountId,
            accountName: `${relationship.account.server} ${relationship.account.loginHint}`,
            strategyId: relationship.strategyId,
            riskPercent: relationship.riskPercent,
            action: "pause",
          });
          await prisma.liveCopyRelationship.update({ where: { id: relationship.id }, data: { status: "PAUSED", lastError: null } });
          pausedCount += 1;
        } catch (error) {
          const message = error instanceof Error ? error.message.slice(0, 500) : "CopyFactory did not confirm the pause.";
          await prisma.liveCopyRelationship.update({ where: { id: relationship.id }, data: { status: "ERROR", lastError: message } });
          pauseFailures.push({ relationshipId: relationship.id, message });
        }
      }
    }

    return NextResponse.json({
      status, pausedCount, pauseFailureCount: pauseFailures.length,
      pauseFailures: pauseFailures.map(({ relationshipId }) => ({ relationshipId })),
      message: pauseFailures.length ? "Provider status changed, but one or more live accounts did not confirm a pause. Review the relationship errors immediately." : undefined,
    });
  } catch (error) {
    if (error instanceof MetaApiError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("ADMIN COPY TRADING PATCH ERROR:", error);
    return NextResponse.json({ error: "Unable to save this provider review." }, { status: 500 });
  }
}
