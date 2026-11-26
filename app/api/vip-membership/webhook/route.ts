import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getPaystackPlanCodeFromEventData,
  getVipPlanCode,
  isVipPlanCode,
  parsePaystackMetadata,
  verifyPaystackWebhookSignature,
} from "@/lib/paystack-vip";

export const dynamic = "force-dynamic";

type PaystackEvent = { event?: unknown; data?: unknown };

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyPaystackWebhookSignature(rawBody, request.headers)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let payload: PaystackEvent;
  try { payload = JSON.parse(rawBody) as PaystackEvent; }
  catch { return NextResponse.json({ error: "Invalid webhook body." }, { status: 400 }); }
  if (!payload.data || typeof payload.data !== "object" || Array.isArray(payload.data)) return NextResponse.json({ received: true });

  const data = payload.data as Record<string, unknown>;
  const planCode = getPaystackPlanCodeFromEventData(data);
  if (!planCode || !isVipPlanCode(planCode)) return NextResponse.json({ received: true });

  try {
    const metadata = parsePaystackMetadata(data.metadata);
    const userId = typeof metadata?.userId === "string" ? metadata.userId : "";
    const customer = data.customer && typeof data.customer === "object" && !Array.isArray(data.customer)
      ? data.customer as Record<string, unknown>
      : null;
    const customerEmail = typeof customer?.email === "string" ? customer.email.trim().toLowerCase() : "";
    const eventName = typeof payload.event === "string" ? payload.event : "";

    if ((eventName === "charge.success" || eventName === "subscription.create") && metadata?.product === "VIP_SIGNALS" && userId) {
      await prisma.user.updateMany({ where: { id: userId, email: customerEmail }, data: { isVip: true } });
    } else if (eventName === "subscription.disable" && customerEmail) {
      await prisma.user.updateMany({ where: { email: customerEmail, isVip: true }, data: { isVip: false } });
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("PAYSTACK VIP WEBHOOK ERROR:", error);
    return NextResponse.json({ error: "Unable to process VIP membership event." }, { status: 500 });
  }
}
