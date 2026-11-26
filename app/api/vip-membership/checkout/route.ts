import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { getVipAppBaseUrl, getVipPlanCode, getVipPlanInterval } from "@/lib/paystack-vip";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to subscribe to Mivo Pro." }, { status: 401 });

  const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!secretKey) return NextResponse.json({ error: "Mivo Pro subscriptions are being configured. Please check back soon." }, { status: 503 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Choose a valid subscription plan." }, { status: 400 }); }
  const interval = getVipPlanInterval(body && typeof body === "object" ? (body as { interval?: unknown }).interval : null);
  if (!interval) return NextResponse.json({ error: "Choose a monthly or annual subscription." }, { status: 400 });

  const planCode = getVipPlanCode(interval);
  if (!planCode) return NextResponse.json({ error: "This Mivo Pro plan is not available yet." }, { status: 503 });

  try {
    const member = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, isVip: true, role: true } });
    if (!member) return NextResponse.json({ error: "Member account not found." }, { status: 401 });
    if (member.isVip || member.role === "ADMIN") return NextResponse.json({ error: "Your account already has Mivo Pro access." }, { status: 409 });

    const appBaseUrl = getVipAppBaseUrl(request.url);
    if (!appBaseUrl) return NextResponse.json({ error: "VIP checkout is not configured for this website yet." }, { status: 503 });

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: member.email,
        plan: planCode,
        callback_url: new URL("/api/vip-membership/callback", appBaseUrl).toString(),
        metadata: JSON.stringify({ product: "MIVO_PRO", userId: member.id, planInterval: interval, planCode }),
      }),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    const result = await response.json() as {
      status?: boolean;
      data?: { authorization_url?: string };
    };
    const authorizationUrl = result.data?.authorization_url;
    if (!response.ok || !result.status || !authorizationUrl) {
      console.error("PAYSTACK VIP CHECKOUT ERROR:", response.status);
      return NextResponse.json({ error: "Unable to start VIP checkout right now. Please try again." }, { status: 502 });
    }

    const parsedCheckoutUrl = new URL(authorizationUrl);
    if (parsedCheckoutUrl.protocol !== "https:" || !parsedCheckoutUrl.hostname.endsWith("paystack.com")) {
      return NextResponse.json({ error: "Paystack returned an invalid checkout link." }, { status: 502 });
    }
    return NextResponse.json({ authorizationUrl: parsedCheckoutUrl.toString() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("VIP CHECKOUT ERROR:", error);
    return NextResponse.json({ error: "Unable to start VIP checkout right now. Please try again." }, { status: 502 });
  }
}
