import { NextResponse } from "next/server";
import { getVipPlanCode, isPaystackConfigured } from "@/lib/paystack-vip";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = isPaystackConfigured();
  return NextResponse.json({
    monthlyAvailable: configured && Boolean(getVipPlanCode("monthly")),
    annualAvailable: configured && Boolean(getVipPlanCode("annually")),
  }, { headers: { "Cache-Control": "no-store" } });
}
