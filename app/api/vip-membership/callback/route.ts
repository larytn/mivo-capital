import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getPaystackPlanCodeFromEventData,
  getVipAppBaseUrl,
  getVipPlanCode,
  getVipPlanInterval,
  parsePaystackMetadata,
} from "@/lib/paystack-vip";

export const dynamic = "force-dynamic";

function signalRedirect(request: NextRequest, outcome: "active" | "failed") {
  const baseUrl = getVipAppBaseUrl(request.url) ?? new URL(request.url).origin;
  return NextResponse.redirect(new URL(`/signals?membership=${outcome}`, baseUrl));
}

export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("reference") ?? request.nextUrl.searchParams.get("trxref");
  const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!reference || reference.length > 120 || !secretKey) return signalRedirect(request, "failed");

  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const result = await response.json() as {
      status?: boolean;
      data?: {
        status?: string;
        reference?: string;
        plan?: unknown;
        customer?: { email?: string };
        metadata?: unknown;
      };
    };
    const data = result.data;
    const metadata = parsePaystackMetadata(data?.metadata);
    const interval = getVipPlanInterval(metadata?.planInterval);
    const configuredPlanCode = interval ? getVipPlanCode(interval) : "";
    const metadataPlanCode = metadata?.planCode;
    const verifiedPlanCode = data ? getPaystackPlanCodeFromEventData(data as Record<string, unknown>) : null;
    const customerEmail = data?.customer?.email?.trim().toLowerCase();
    const userId = typeof metadata?.userId === "string" ? metadata.userId : "";

    if (
      !response.ok || !result.status || data?.status !== "success" || data.reference !== reference ||
      metadata?.product !== "VIP_SIGNALS" || !userId || !configuredPlanCode || metadataPlanCode !== configuredPlanCode ||
      (verifiedPlanCode && verifiedPlanCode !== configuredPlanCode)
    ) return signalRedirect(request, "failed");

    const member = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true } });
    if (!member || !customerEmail || member.email.trim().toLowerCase() !== customerEmail) return signalRedirect(request, "failed");

    await prisma.user.update({ where: { id: member.id }, data: { isVip: true } });
    return signalRedirect(request, "active");
  } catch (error) {
    console.error("PAYSTACK VIP CALLBACK ERROR:", error);
    return signalRedirect(request, "failed");
  }
}
