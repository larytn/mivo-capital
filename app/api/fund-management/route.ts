import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import {
  FUND_MANAGEMENT_DEMO_TERMS,
  FUND_MANAGEMENT_DISCLOSURE_VERSION,
  FUND_MANAGEMENT_ENVIRONMENT,
  FUND_MANAGEMENT_LIVE_ENABLED,
} from "@/lib/fund-management";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

class FundConflictError extends Error {}

export async function GET() {
  const investorId = await getAuthenticatedUserId();
  if (!investorId) return NextResponse.json({ error: "Sign in to view Fund Management." }, { status: 401 });
  try {
    const application = await prisma.fundManagementApplication.findUnique({
      where: { investorId },
      include: {
        mandate: {
          include: {
            managerProfile: { select: { bio: true, specialties: true, user: { select: { name: true } } } },
            account: true,
            agreements: { orderBy: { presentedAt: "desc" }, take: 10 },
            statements: { where: { status: "VERIFIED" }, orderBy: { periodEnd: "desc" }, take: 30 },
            expenses: { where: { status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 50 },
            trades: { where: { status: "VERIFIED" }, orderBy: { openedAt: "desc" }, take: 100 },
            settlements: { orderBy: { periodEnd: "desc" }, take: 30, include: { agreement: { select: { termsVersion: true, investorProfitShareRate: true, mivoProfitShareRate: true } } } },
            redemptionRequests: { where: { investorId }, orderBy: { createdAt: "desc" }, take: 30 },
          },
        },
      },
    });
    return NextResponse.json({
      application,
      demoTerms: FUND_MANAGEMENT_DEMO_TERMS,
      liveEnabled: FUND_MANAGEMENT_LIVE_ENABLED,
      environment: FUND_MANAGEMENT_ENVIRONMENT,
    }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    console.error("FUND MANAGEMENT INVESTOR GET ERROR:", error);
    return NextResponse.json({ error: "Unable to load your Fund Management portal." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const investorId = await getAuthenticatedUserId();
  if (!investorId) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

  try {
    const body = await request.json() as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "";

    if (action === "apply") {
      if (body.riskDisclosureAccepted !== true) return NextResponse.json({ error: "Acknowledge the risk disclosure before applying." }, { status: 400 });
      const investmentExperience = typeof body.investmentExperience === "string" ? body.investmentExperience.trim() : "";
      const investmentObjective = typeof body.investmentObjective === "string" ? body.investmentObjective.trim() : "";
      const riskTolerance = typeof body.riskTolerance === "string" ? body.riskTolerance : "";
      const lossCapacity = typeof body.lossCapacity === "string" ? body.lossCapacity : "";
      if (investmentExperience.length < 20 || investmentExperience.length > 2000 || investmentObjective.length < 20 || investmentObjective.length > 1200) {
        return NextResponse.json({ error: "Add your investment experience and objective. Each answer must be at least 20 characters." }, { status: 400 });
      }
      if (!["LOW", "MODERATE", "HIGH"].includes(riskTolerance) || !["LOW", "MODERATE", "HIGH"].includes(lossCapacity)) {
        return NextResponse.json({ error: "Choose your risk tolerance and capacity to absorb investment losses." }, { status: 400 });
      }

      const prior = await prisma.fundManagementApplication.findUnique({ where: { investorId }, select: { id: true, status: true, mandate: { select: { id: true } } } });
      if (prior?.mandate || (prior && !["NEEDS_INFO", "REJECTED"].includes(prior.status))) {
        return NextResponse.json({ error: "Your application is already in review or has an assigned mandate. Contact Mivo if your information needs to change." }, { status: 409 });
      }
      const now = new Date();
      const application = await prisma.$transaction(async (tx) => {
        const saved = await tx.fundManagementApplication.upsert({
          where: { investorId },
          create: {
            investorId, investmentExperience, investmentObjective, riskTolerance, lossCapacity,
            riskDisclosureVersion: FUND_MANAGEMENT_DISCLOSURE_VERSION, riskDisclosureAcceptedAt: now,
          },
          update: {
            investmentExperience, investmentObjective, riskTolerance, lossCapacity,
            riskDisclosureVersion: FUND_MANAGEMENT_DISCLOSURE_VERSION, riskDisclosureAcceptedAt: now,
            status: "PENDING", identityVerificationStatus: "PENDING", suitabilityStatus: "PENDING",
            verificationReference: null, reviewNote: null, reviewedAt: null,
          },
        });
        await tx.fundManagementAudit.create({ data: {
          actorId: investorId, applicationId: saved.id, action: "INVESTOR_APPLICATION_SUBMITTED",
          details: { disclosureVersion: FUND_MANAGEMENT_DISCLOSURE_VERSION },
        } });
        return saved;
      });
      return NextResponse.json({ application, message: "Application submitted. Mivo will review identity verification and suitability before proposing a demo mandate." }, { status: prior ? 200 : 201 });
    }

    if (action === "accept_demo_terms") {
      if (body.accepted !== true) return NextResponse.json({ error: "Acknowledge the demo-only terms before continuing." }, { status: 400 });
      const mandate = await prisma.fundManagementMandate.findFirst({ where: { investorId, environment: "DEMO", status: "PENDING_AGREEMENT" } });
      if (!mandate) return NextResponse.json({ error: "There is no demo mandate waiting for your acknowledgement." }, { status: 409 });
      const agreement = await prisma.fundManagementAgreement.findFirst({ where: { mandateId: mandate.id, status: "PRESENTED" }, orderBy: { presentedAt: "desc" } });
      if (!agreement) return NextResponse.json({ error: "Mivo has not presented demo terms for this mandate." }, { status: 409 });

      await prisma.$transaction(async (tx) => {
        const accepted = await tx.fundManagementAgreement.updateMany({ where: { id: agreement.id, status: "PRESENTED" }, data: { status: "DEMO_ACKNOWLEDGED", acceptedAt: new Date() } });
        if (accepted.count !== 1) throw new FundConflictError("These terms have already been acknowledged.");
        const activated = await tx.fundManagementMandate.updateMany({ where: { id: mandate.id, status: "PENDING_AGREEMENT", environment: "DEMO" }, data: { status: "DEMO_ACTIVE" } });
        if (activated.count !== 1) throw new FundConflictError("This demo mandate is no longer awaiting acknowledgement.");
        await tx.fundManagementAudit.create({ data: {
          actorId: investorId, applicationId: mandate.applicationId, mandateId: mandate.id,
          action: "DEMO_TERMS_ACKNOWLEDGED", details: { agreementId: agreement.id, termsVersion: agreement.termsVersion },
        } });
      });
      return NextResponse.json({ message: "Demo mandate acknowledged. This does not open an account or authorize real-money activity." });
    }

    if (action === "request_redemption") {
      const mandate = await prisma.fundManagementMandate.findFirst({ where: { investorId, environment: "DEMO", status: "DEMO_ACTIVE" }, select: { id: true, applicationId: true, currency: true } });
      if (!mandate) return NextResponse.json({ error: "A demo mandate is required to submit a redemption request." }, { status: 409 });
      const requestedAmount = body.amount === undefined || body.amount === "" ? null : Number(body.amount);
      if (requestedAmount !== null && (!Number.isFinite(requestedAmount) || requestedAmount <= 0)) return NextResponse.json({ error: "Enter a positive amount or leave the amount blank." }, { status: 400 });
      const message = typeof body.message === "string" ? body.message.trim().slice(0, 500) || null : null;
      const redemption = await prisma.$transaction(async (tx) => {
        const created = await tx.fundManagementRedemptionRequest.create({ data: {
          mandateId: mandate.id, applicationId: mandate.applicationId, investorId,
          requestedAmount, currency: mandate.currency,
          message, status: "DEMO_REQUESTED",
        } });
        await tx.fundManagementAudit.create({ data: {
          actorId: investorId, applicationId: mandate.applicationId, mandateId: mandate.id,
          action: "DEMO_REDEMPTION_REQUESTED", details: { redemptionId: created.id },
        } });
        return created;
      });
      return NextResponse.json({ redemption, message: "Demo request recorded for review. It is not an instruction to transfer money; no investor funds are held by Mivo." }, { status: 201 });
    }

    if (["deposit", "fund_account", "payout", "trade"].includes(action)) {
      return NextResponse.json({ error: "Real-money deposits, custody, discretionary trading and payouts are disabled for Fund Management." }, { status: 410 });
    }
    return NextResponse.json({ error: "Choose a supported Fund Management action." }, { status: 400 });
  } catch (error) {
    console.error("FUND MANAGEMENT INVESTOR POST ERROR:", error);
    if (error instanceof FundConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json({ error: "Unable to save your request." }, { status: 500 });
  }
}
