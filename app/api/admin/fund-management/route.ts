import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { FUND_MANAGEMENT_FREQUENCIES, FUND_MANAGEMENT_TERMS_VERSION } from "@/lib/fund-management";
import { calculateFundPeriod } from "@/lib/fund-management-accounting";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

class FundAdminConflictError extends Error {}

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
    const [applications, managers, mandates, redemptions, audit] = await Promise.all([
      prisma.fundManagementApplication.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { investor: { select: { id: true, name: true, email: true } }, mandate: { select: { id: true, status: true, environment: true } } } }),
      prisma.fundManagerProfile.findMany({ where: { status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 100, include: { user: { select: { id: true, name: true, email: true } } } }),
      prisma.fundManagementMandate.findMany({ orderBy: { assignedAt: "desc" }, take: 100, include: { investor: { select: { name: true, email: true } }, managerProfile: { include: { user: { select: { name: true, email: true } } } }, application: { select: { status: true, identityVerificationStatus: true, suitabilityStatus: true } }, account: true, agreements: { orderBy: { presentedAt: "desc" }, take: 3 }, statements: { orderBy: { periodEnd: "desc" }, take: 20 }, trades: { orderBy: { openedAt: "desc" }, take: 30 }, expenses: { orderBy: { createdAt: "desc" }, take: 40 }, settlements: { orderBy: { periodEnd: "desc" }, take: 20, include: { agreement: { select: { termsVersion: true } } } } } }),
      prisma.fundManagementRedemptionRequest.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { investor: { select: { name: true, email: true } }, mandate: { select: { environment: true, status: true, currency: true } } } }),
      prisma.fundManagementAudit.findMany({ orderBy: { createdAt: "desc" }, take: 150, include: { actor: { select: { name: true, email: true } } } }),
    ]);
    const managerUsers = await prisma.user.findMany({ orderBy: { name: "asc" }, take: 500, select: { id: true, name: true, email: true, fundManagerProfile: { select: { status: true } } } });
    const availableManagerUsers = managerUsers.filter((user) => user.fundManagerProfile?.status !== "APPROVED").map((user) => ({ id: user.id, name: user.name, email: user.email }));
    return NextResponse.json({ applications, managers, availableManagerUsers, mandates, redemptions, audit, liveEnabled: false }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    console.error("ADMIN FUND MANAGEMENT GET ERROR:", error);
    return NextResponse.json({ error: "Unable to load Fund Management oversight." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const adminId = await getAdminId();
  if (!adminId) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "";
    const id = typeof body.id === "string" ? body.id.trim() : "";
    const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : "";
    if (notes.length < 5) return NextResponse.json({ error: "Add a review note of at least five characters." }, { status: 400 });

    if (["approve_investor", "request_info_investor", "reject_investor"].includes(action)) {
      const application = await prisma.fundManagementApplication.findUnique({ where: { id } });
      if (!application) return NextResponse.json({ error: "Investor application not found." }, { status: 404 });
      if (!["PENDING", "NEEDS_INFO"].includes(application.status)) return NextResponse.json({ error: "This application is not open for review." }, { status: 409 });
      if (action === "approve_investor" && (body.identityVerified !== true || body.suitabilityApproved !== true || typeof body.verificationReference !== "string" || body.verificationReference.trim().length < 4)) {
        return NextResponse.json({ error: "Complete the required identity and suitability checks and record the external verification reference before approving." }, { status: 400 });
      }
      const status = action === "approve_investor" ? "APPROVED" : action === "request_info_investor" ? "NEEDS_INFO" : "REJECTED";
      await prisma.$transaction(async (tx) => {
        const updated = await tx.fundManagementApplication.updateMany({ where: { id, status: application.status }, data: {
          status, reviewNote: notes, reviewedAt: new Date(),
          identityVerificationStatus: action === "approve_investor" ? "VERIFIED" : application.identityVerificationStatus,
          suitabilityStatus: action === "approve_investor" ? "APPROVED" : application.suitabilityStatus,
          verificationReference: action === "approve_investor" ? String(body.verificationReference).trim().slice(0, 200) : application.verificationReference,
        } });
        if (updated.count !== 1) throw new FundAdminConflictError("This application changed during review. Reload it before deciding.");
        await tx.fundManagementAudit.create({ data: { actorId: adminId, applicationId: id, action: `INVESTOR_${status}`, details: { notes } } });
      });
      return NextResponse.json({ status });
    }

    if (action === "appoint_manager") {
      const managerUserId = typeof body.managerUserId === "string" ? body.managerUserId.trim() : "";
      const bio = typeof body.bio === "string" ? body.bio.trim().slice(0, 2000) : "";
      const experience = typeof body.experience === "string" ? body.experience.trim().slice(0, 3000) : "";
      const specialties = typeof body.specialties === "string" ? body.specialties.trim().slice(0, 300) : "";
      if (!managerUserId || bio.length < 20 || experience.length < 20 || specialties.length < 3) return NextResponse.json({ error: "Choose an existing platform user and add manager qualifications and specialties." }, { status: 400 });
      if (!await prisma.user.findUnique({ where: { id: managerUserId }, select: { id: true } })) return NextResponse.json({ error: "Selected platform user was not found." }, { status: 404 });
      const profile = await prisma.$transaction(async (tx) => {
        const existing = await tx.fundManagerProfile.findUnique({ where: { userId: managerUserId }, select: { id: true, status: true } });
        if (existing?.status === "APPROVED") throw new FundAdminConflictError("This person is already on the Mivo-appointed manager roster.");
        const saved = await tx.fundManagerProfile.upsert({
          where: { userId: managerUserId },
          create: { userId: managerUserId, bio, experience, specialties, status: "APPROVED", reviewNote: notes, reviewedAt: new Date() },
          update: { bio, experience, specialties, status: "APPROVED", reviewNote: notes, reviewedAt: new Date() },
        });
        await tx.fundManagementAudit.create({ data: { actorId: adminId, action: "MIVO_MANAGER_APPOINTED", details: { profileId: saved.id, managerUserId, notes } } });
        return saved;
      });
      return NextResponse.json({ profile, status: "APPROVED", message: "Mivo appointment recorded. This enables demo mandate assignment only; it does not authorize live trading." }, { status: 201 });
    }

    if (action === "assign_demo_mandate") {
      const applicationId = typeof body.applicationId === "string" ? body.applicationId : "";
      const managerProfileId = typeof body.managerProfileId === "string" ? body.managerProfileId : "";
      const investorProfitShareRate = Number(body.investorProfitShareRate);
      const mivoProfitShareRate = Number(body.mivoProfitShareRate);
      const maxDrawdownPercent = Number(body.maxDrawdownPercent);
      const maxLeverage = body.maxLeverage === "" || body.maxLeverage == null ? null : Number(body.maxLeverage);
      const frequency = typeof body.settlementFrequency === "string" ? body.settlementFrequency : "";
      const investorShareUnits = Math.round(investorProfitShareRate * 1_000_000);
      const mivoShareUnits = Math.round(mivoProfitShareRate * 1_000_000);
      if (!applicationId || !managerProfileId || !FUND_MANAGEMENT_FREQUENCIES.includes(frequency as typeof FUND_MANAGEMENT_FREQUENCIES[number]) || !Number.isFinite(investorProfitShareRate) || !Number.isFinite(mivoProfitShareRate) || investorShareUnits + mivoShareUnits !== 1_000_000 || investorProfitShareRate < 0 || investorProfitShareRate > 1 || mivoProfitShareRate < 0 || mivoProfitShareRate > 1 || !Number.isFinite(maxDrawdownPercent) || maxDrawdownPercent <= 0 || maxDrawdownPercent > 100 || (maxLeverage !== null && (!Number.isFinite(maxLeverage) || maxLeverage <= 0 || maxLeverage > 100))) {
        return NextResponse.json({ error: "Enter a valid investor/Mivo split totaling 100%, settlement schedule and risk limits." }, { status: 400 });
      }
      const [application, manager] = await Promise.all([
        prisma.fundManagementApplication.findUnique({ where: { id: applicationId }, select: { id: true, investorId: true, status: true, identityVerificationStatus: true, suitabilityStatus: true } }),
        prisma.fundManagerProfile.findUnique({ where: { id: managerProfileId }, select: { id: true, status: true } }),
      ]);
      if (!application || application.status !== "APPROVED" || application.identityVerificationStatus !== "VERIFIED" || application.suitabilityStatus !== "APPROVED") return NextResponse.json({ error: "Investor must pass recorded identity and suitability review before assignment." }, { status: 409 });
      if (!manager || manager.status !== "APPROVED") return NextResponse.json({ error: "Select an internally approved manager." }, { status: 409 });
      if (await prisma.fundManagementMandate.findUnique({ where: { applicationId }, select: { id: true } })) return NextResponse.json({ error: "A mandate already exists for this application." }, { status: 409 });
      const mandate = await prisma.$transaction(async (tx) => {
        const created = await tx.fundManagementMandate.create({ data: {
          applicationId, investorId: application.investorId, managerProfileId, environment: "DEMO", status: "PENDING_AGREEMENT",
          investorProfitShareRate: investorShareUnits / 1_000_000, mivoProfitShareRate: mivoShareUnits / 1_000_000, settlementFrequency: frequency,
          maxDrawdownPercent, maxLeverage,
        } });
        const agreement = await tx.fundManagementAgreement.create({ data: {
          mandateId: created.id, investorId: application.investorId, termsVersion: FUND_MANAGEMENT_TERMS_VERSION,
          investorProfitShareRate: investorShareUnits / 1_000_000, mivoProfitShareRate: mivoShareUnits / 1_000_000, settlementFrequency: frequency,
          riskLimits: { maxDrawdownPercent, maxLeverage, environment: "DEMO" }, status: "PRESENTED",
        } });
        await tx.fundManagementAudit.create({ data: { actorId: adminId, applicationId, mandateId: created.id, action: "DEMO_MANDATE_ASSIGNED", details: { agreementId: agreement.id, managerProfileId, notes } } });
        return created;
      });
      return NextResponse.json({ mandate, message: "Demo mandate assigned. No account was opened or funded." }, { status: 201 });
    }

    if (action === "review_demo_redemption") {
      const decision = body.decision === "reject" ? "reject" : body.decision === "review" ? "review" : "";
      if (!id || !decision) return NextResponse.json({ error: "Choose a demo redemption request and a review action." }, { status: 400 });
      const item = await prisma.fundManagementRedemptionRequest.findUnique({ where: { id }, select: { id: true, applicationId: true, mandateId: true, status: true } });
      if (!item || item.status !== "DEMO_REQUESTED") return NextResponse.json({ error: "Open demo request not found." }, { status: 404 });
      const status = decision === "review" ? "DEMO_REVIEWED" : "DECLINED";
      await prisma.$transaction(async (tx) => {
        const updated = await tx.fundManagementRedemptionRequest.updateMany({ where: { id, status: "DEMO_REQUESTED" }, data: { status, handledAt: new Date(), handledById: adminId } });
        if (updated.count !== 1) throw new FundAdminConflictError("This demo request was already reviewed. Reload the queue.");
        await tx.fundManagementAudit.create({ data: { actorId: adminId, applicationId: item.applicationId, mandateId: item.mandateId, action: `DEMO_REDEMPTION_${status}`, details: { requestId: id, notes } } });
      });
      return NextResponse.json({ status, message: "Review recorded only. No payout or money transfer occurred." });
    }

    if (action === "preview_settlement") {
      const statement = await prisma.fundManagementStatement.findUnique({ where: { id }, include: { mandate: true, expenses: { where: { status: "APPROVED" } } } });
      if (!statement || statement.status !== "VERIFIED" || statement.mandate.environment !== "DEMO" || statement.mandate.status !== "DEMO_ACTIVE") return NextResponse.json({ error: "A verified statement on an acknowledged active demo mandate is required for a calculation preview." }, { status: 409 });
      if (statement.expenses.some((expense) => expense.currency !== statement.currency)) return NextResponse.json({ error: "Approved expenses must use the statement currency or be reconciled through an approved conversion record." }, { status: 409 });
      const agreement = await prisma.fundManagementAgreement.findFirst({ where: { mandateId: statement.mandateId, status: "DEMO_ACKNOWLEDGED", acceptedAt: { not: null } }, orderBy: { acceptedAt: "desc" } });
      if (!agreement) return NextResponse.json({ error: "Acknowledged demo agreement not found for this mandate." }, { status: 409 });
      if (await prisma.fundManagementSettlement.findUnique({ where: { statementId: statement.id }, select: { id: true } })) return NextResponse.json({ error: "A preview already exists for this statement." }, { status: 409 });
      const calculation = calculateFundPeriod({
        previousHighWaterMark: statement.mandate.highWaterMarkProfit.toString(),
        previousLossCarryForward: statement.mandate.lossCarryForward.toString(),
        verifiedRealizedPnl: statement.realizedPnl.toString(),
        unrealizedPnl: statement.unrealizedPnl.toString(),
        tradingCosts: statement.tradingCosts.toString(),
        approvedExpenses: statement.expenses.map((expense) => expense.amount.toString()),
        mivoShareRate: agreement.mivoProfitShareRate.toString(),
        statementVerified: true,
      });
      const preview = await prisma.$transaction(async (tx) => {
        const created = await tx.fundManagementSettlement.create({ data: {
          mandateId: statement.mandateId, agreementId: agreement.id, statementId: statement.id,
          periodStart: statement.periodStart, periodEnd: statement.periodEnd,
          frequency: agreement.settlementFrequency, currency: statement.currency,
          balanceSnapshot: statement.balance, equitySnapshot: statement.equity,
          realizedPnl: statement.realizedPnl, unrealizedPnl: statement.unrealizedPnl,
          tradingCosts: calculation.tradingCosts, approvedExpenses: calculation.approvedExpenses,
          netRealizedProfit: calculation.netRealizedProfit, eligibleProfit: calculation.eligibleProfit,
          highWaterMarkBefore: calculation.highWaterMarkBefore, highWaterMarkAfter: calculation.highWaterMarkAfter,
          lossCarryForwardBefore: calculation.lossCarryForwardBefore, lossCarryForwardAfter: calculation.lossCarryForwardAfter,
          mivoShareAmount: calculation.mivoShareAmount, investorShareAmount: calculation.investorShareAmount,
          status: "PREVIEW_ONLY",
        } });
        await tx.fundManagementAudit.create({ data: { actorId: adminId, mandateId: statement.mandateId, action: "SETTLEMENT_PREVIEW_CREATED", details: { statementId: statement.id, agreementId: agreement.id, settlementId: created.id, notes } } });
        return created;
      });
      return NextResponse.json({ preview, message: "Calculation preview recorded. The high-water mark was not advanced and no payment was created." }, { status: 201 });
    }

    return NextResponse.json({ error: "Choose a supported review action." }, { status: 400 });
  } catch (error) {
    console.error("ADMIN FUND MANAGEMENT PATCH ERROR:", error);
    if (error instanceof FundAdminConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json({ error: "Unable to save this Fund Management review." }, { status: 500 });
  }
}
