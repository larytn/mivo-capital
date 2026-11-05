import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

async function adminId() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return null;
  const admin = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
  return admin?.role === "ADMIN" ? admin.id : null;
}

function parseSignal(body: Record<string, unknown>) {
  const symbol = typeof body.symbol === "string" ? body.symbol.trim().toUpperCase() : "";
  const side = body.side === "BUY" || body.side === "SELL" ? body.side : "";
  const timeframe = typeof body.timeframe === "string" ? body.timeframe : "";
  const entryLow = Number(body.entryLow);
  const entryHigh = Number(body.entryHigh);
  const stopLoss = Number(body.stopLoss);
  const takeProfits = Array.isArray(body.takeProfits) ? body.takeProfits.map(Number) : [];
  const thesis = typeof body.thesis === "string" ? body.thesis.trim() : "";
  const supportedTimeframes = new Set(["M5", "M15", "M30", "H1", "H4", "D1", "W1"]);

  if (!/^[A-Z0-9._-]{3,24}$/.test(symbol) || !side || !supportedTimeframes.has(timeframe)
    || ![entryLow, entryHigh, stopLoss].every((value) => Number.isFinite(value) && value > 0)
    || entryLow > entryHigh || takeProfits.length < 1 || takeProfits.length > 3
    || !takeProfits.every((value) => Number.isFinite(value) && value > 0)
    || thesis.length < 20 || thesis.length > 1600) return null;

  const invalidDirection = side === "BUY"
    ? stopLoss >= entryLow || takeProfits.some((value) => value <= entryHigh)
    : stopLoss <= entryHigh || takeProfits.some((value) => value >= entryLow);
  if (invalidDirection) return null;
  return { symbol, side, timeframe, entryLow, entryHigh, stopLoss, takeProfits, thesis };
}

export async function GET() {
  const id = await adminId();
  if (!id) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  try {
    const signals = await prisma.vipSignal.findMany({ orderBy: { publishedAt: "desc" }, take: 200, include: { createdBy: { select: { name: true } } } });
    return NextResponse.json({ signals });
  } catch (error) {
    console.error("ADMIN VIP SIGNALS GET ERROR:", error);
    return NextResponse.json({ error: "Unable to load VIP Signals." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const id = await adminId();
  if (!id) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const signal = parseSignal(body);
    if (!signal) return NextResponse.json({ error: "Check the market, timeframe, entry range, stop, targets and analysis." }, { status: 400 });
    const created = await prisma.vipSignal.create({ data: { ...signal, createdById: id } });
    return NextResponse.json({ signal: created }, { status: 201 });
  } catch (error) {
    console.error("ADMIN VIP SIGNALS POST ERROR:", error);
    return NextResponse.json({ error: "Unable to publish this signal." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const id = await adminId();
  if (!id) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  try {
    const body = await request.json() as { signalId?: unknown; status?: unknown; outcomeNote?: unknown };
    const signalId = typeof body.signalId === "string" ? body.signalId.trim() : "";
    const status = body.status === "CLOSED" || body.status === "CANCELLED" ? body.status : "";
    const outcomeNote = typeof body.outcomeNote === "string" ? body.outcomeNote.trim().slice(0, 800) : "";
    if (!signalId || !status) return NextResponse.json({ error: "Choose a signal and a valid close status." }, { status: 400 });
    const updated = await prisma.vipSignal.updateMany({
      where: { id: signalId, status: "ACTIVE" },
      data: { status, outcomeNote: outcomeNote || null, closedAt: new Date() },
    });
    if (updated.count === 0) return NextResponse.json({ error: "Active signal not found." }, { status: 404 });
    return NextResponse.json({ updated: true });
  } catch (error) {
    console.error("ADMIN VIP SIGNALS PATCH ERROR:", error);
    return NextResponse.json({ error: "Unable to update this signal." }, { status: 500 });
  }
}
