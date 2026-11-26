import { createHmac, timingSafeEqual } from "node:crypto";

export type VipPlanInterval = "monthly" | "annually";

export function getVipPlanCode(interval: VipPlanInterval) {
  return interval === "monthly"
    ? process.env.PAYSTACK_VIP_MONTHLY_PLAN_CODE?.trim() ?? ""
    : process.env.PAYSTACK_VIP_ANNUAL_PLAN_CODE?.trim() ?? "";
}

export function isPaystackConfigured() {
  return Boolean(process.env.PAYSTACK_SECRET_KEY?.trim());
}

export function getVipPlanInterval(value: unknown): VipPlanInterval | null {
  return value === "monthly" || value === "annually" ? value : null;
}

export function isVipPlanCode(value: unknown): value is string {
  return typeof value === "string" && Boolean(value) && [
    getVipPlanCode("monthly"),
    getVipPlanCode("annually"),
  ].includes(value);
}

export function getVipAppBaseUrl(fallbackUrl: string) {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.AUTH_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    (process.env.NODE_ENV !== "production" ? fallbackUrl : "");

  if (!configuredUrl) return null;

  try {
    const parsed = new URL(configuredUrl);
    if (parsed.protocol !== "https:" && process.env.NODE_ENV === "production") return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

export function parsePaystackMetadata(value: unknown): Record<string, unknown> | null {
  let parsed = value;
  if (typeof parsed === "string") {
    try { parsed = JSON.parse(parsed) as unknown; }
    catch { return null; }
  }
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? parsed as Record<string, unknown>
    : null;
}

function matchesHexSignature(expected: Buffer, received: string) {
  if (!/^[0-9a-f]{128}$/i.test(received)) return false;
  const receivedBytes = Buffer.from(received, "hex");
  return receivedBytes.length === expected.length && timingSafeEqual(expected, receivedBytes);
}

export function verifyPaystackWebhookSignature(rawBody: string, headers: Headers) {
  const signingSecret = process.env.PAYSTACK_WEBHOOK_SECRET?.trim();
  const modernSignature = headers.get("paystack-signature");

  if (signingSecret && modernSignature) {
    const fields = modernSignature.split(",").map((field) => field.trim());
    const timestamp = fields.find((field) => field.startsWith("t="))?.slice(2);
    if (!timestamp || !/^\d+$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
    const expected = createHmac("sha512", signingSecret).update(`${timestamp}.${rawBody}`).digest();
    return fields
      .filter((field) => field.startsWith("v1="))
      .some((field) => matchesHexSignature(expected, field.slice(3).split(":").at(-1) ?? ""));
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim();
  const legacySignature = headers.get("x-paystack-signature") ?? "";
  if (!secretKey) return false;
  const expected = createHmac("sha512", secretKey).update(rawBody).digest();
  return matchesHexSignature(expected, legacySignature);
}

export function getPaystackPlanCodeFromEventData(data: Record<string, unknown>) {
  const plan = data.plan;
  if (typeof plan === "string") return plan;
  if (plan && typeof plan === "object" && !Array.isArray(plan)) {
    const planRecord = plan as Record<string, unknown>;
    if (typeof planRecord.plan_code === "string") return planRecord.plan_code;
    if (typeof planRecord.planCode === "string") return planRecord.planCode;
  }
  return typeof data.plan_code === "string" ? data.plan_code : null;
}
