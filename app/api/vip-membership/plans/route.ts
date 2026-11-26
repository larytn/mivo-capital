import { NextResponse } from "next/server";
import { getVipPlanCode, isPaystackConfigured, type VipPlanInterval } from "@/lib/paystack-vip";

export const dynamic = "force-dynamic";

type PaystackPlanOption = { configured: boolean; amount: number | null; currency: string | null };
type PaystackPlanResponse = {
  status?: boolean;
  data?: { plan_code?: string; interval?: string; amount?: number; currency?: string };
};

async function readPlan(interval: VipPlanInterval, secretKey: string): Promise<PaystackPlanOption> {
  const planCode = getVipPlanCode(interval);
  if (!planCode) return { configured: false, amount: null, currency: null };

  try {
    const response = await fetch(`https://api.paystack.co/plan/${encodeURIComponent(planCode)}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const result = await response.json() as PaystackPlanResponse;
    const plan = result.data;
    const amount = Number(plan?.amount);
    const currency = typeof plan?.currency === "string" ? plan.currency.toUpperCase() : "";
    const expectedInterval = interval === "monthly" ? "monthly" : "annually";
    if (!response.ok || !result.status || !plan || plan.plan_code !== planCode || plan.interval !== expectedInterval || !Number.isSafeInteger(amount) || amount <= 0 || !/^[A-Z]{3}$/.test(currency)) {
      return { configured: true, amount: null, currency: null };
    }
    return { configured: true, amount, currency };
  } catch {
    return { configured: true, amount: null, currency: null };
  }
}

export async function GET() {
  const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim() || "";
  const configured = isPaystackConfigured() && Boolean(secretKey);
  const [monthly, annually] = configured
    ? await Promise.all([readPlan("monthly", secretKey), readPlan("annually", secretKey)])
    : [
      { configured: false, amount: null, currency: null },
      { configured: false, amount: null, currency: null },
    ];
  return NextResponse.json({
    monthly,
    annually,
    monthlyAvailable: monthly.configured,
    annualAvailable: annually.configured,
  }, { headers: { "Cache-Control": "no-store" } });
}
