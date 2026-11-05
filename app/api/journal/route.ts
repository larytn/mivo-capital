
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/api-auth";

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const trades = await prisma.journalTrade.findMany({
      where: { userId },
      orderBy: { openedAt: "desc" },
    });

    return NextResponse.json({ trades });
  } catch (error) {
    console.error("JOURNAL GET ERROR:", error);
    return NextResponse.json(
      { error: "Unable to load journal. Check the database schema." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const symbol =
      typeof body.symbol === "string" ? body.symbol.trim().toUpperCase() : "";
    const direction = body.direction;
    const status = body.status;
    const entryPrice = Number(body.entryPrice);
    const pnl = Number(body.pnl ?? 0);
    const fees = Number(body.fees ?? 0);
    const openedAt = new Date(body.openedAt);

    if (
      !symbol ||
      symbol.length > 32 ||
      !["BUY", "SELL"].includes(direction) ||
      !["OPEN", "CLOSED"].includes(status) ||
      !Number.isFinite(entryPrice) ||
      entryPrice <= 0 ||
      !Number.isFinite(pnl) ||
      !Number.isFinite(fees) ||
      fees < 0 ||
      Number.isNaN(openedAt.getTime())
    ) {
      return NextResponse.json(
        { error: "Enter a valid symbol, direction, entry price and date." },
        { status: 400 }
      );
    }

    const optionalNumber = (value: unknown) => {
      if (value === null || value === undefined || value === "") return null;
      const number = Number(value);
      return Number.isFinite(number) ? number : NaN;
    };

    const exitPrice = optionalNumber(body.exitPrice);
    const stopLoss = optionalNumber(body.stopLoss);
    const takeProfit = optionalNumber(body.takeProfit);
    const currentPrice = optionalNumber(body.currentPrice);
    const quantity = optionalNumber(body.quantity);
    const riskAmount = optionalNumber(body.riskAmount);

    if ([exitPrice, stopLoss, takeProfit, currentPrice, quantity, riskAmount].some((value) => Number.isNaN(value))
      || (quantity !== null && quantity <= 0)
      || (riskAmount !== null && riskAmount < 0)
      || [exitPrice, stopLoss, takeProfit, currentPrice].some((value) => value !== null && value <= 0)
      || (status === "CLOSED" && (!exitPrice || exitPrice <= 0))) {
      return NextResponse.json(
        { error: "Prices must be valid numbers." },
        { status: 400 }
      );
    }

    const trade = await prisma.journalTrade.create({
      data: {
        userId,
        symbol,
        direction,
        status,
        entryPrice,
        exitPrice,
        stopLoss,
        takeProfit,
        currentPrice: status === "CLOSED" ? exitPrice : currentPrice ?? entryPrice,
        quantity,
        riskAmount,
        pnl,
        fees,
        openedAt,
        closedAt: status === "CLOSED" ? new Date() : null,
        strategy:
          typeof body.strategy === "string" ? body.strategy.trim() || null : null,
        notes:
          typeof body.notes === "string" ? body.notes.trim() || null : null,
        screenshotUrl:
          typeof body.screenshotUrl === "string" &&
          body.screenshotUrl.trim() !== ""
            ? body.screenshotUrl.trim()
            : null,
        isPublic: body.isPublic === true,
      },
    });

    return NextResponse.json({ trade }, { status: 201 });
  } catch (error) {
    console.error("JOURNAL POST ERROR:", error);
    return NextResponse.json(
      { error: "Unable to save trade. Check the database schema." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) return NextResponse.json({ error: "Choose a journal trade." }, { status: 400 });
    const existing = await prisma.journalTrade.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "Trade not found." }, { status: 404 });

    const data: {
      isPublic?: boolean; currentPrice?: number | null; stopLoss?: number | null; takeProfit?: number | null;
      status?: string; exitPrice?: number; closedAt?: Date; pnl?: number; updatedAt?: Date;
    } = {};
    if (typeof body.isPublic === "boolean") data.isPublic = body.isPublic;
    for (const field of ["currentPrice", "stopLoss", "takeProfit"] as const) {
      if (!(field in body)) continue;
      if (field === "currentPrice" && existing.status !== "OPEN") return NextResponse.json({ error: "Only open trades can receive a new market price." }, { status: 409 });
      if (body[field] === null || body[field] === "") {
        if (field === "currentPrice") return NextResponse.json({ error: "Enter a current market price for an open trade." }, { status: 400 });
        data[field] = null;
        continue;
      }
      const value = Number(body[field]);
      if (!Number.isFinite(value) || value <= 0) {
        return NextResponse.json({ error: "Trade prices must be valid numbers." }, { status: 400 });
      }
      data[field] = value;
    }

    if (body.status === "CLOSED") {
      if (existing.status !== "OPEN") return NextResponse.json({ error: "Only open trades can be closed." }, { status: 409 });
      const exitPrice = Number(body.exitPrice);
      if (!Number.isFinite(exitPrice) || exitPrice <= 0) return NextResponse.json({ error: "Enter a valid closing price." }, { status: 400 });
      data.status = "CLOSED";
      data.exitPrice = exitPrice;
      data.currentPrice = exitPrice;
      data.closedAt = new Date();
      if (body.pnl !== undefined) {
        const pnl = Number(body.pnl);
        if (!Number.isFinite(pnl)) return NextResponse.json({ error: "Enter a valid realized profit or loss." }, { status: 400 });
        data.pnl = pnl;
      }
    } else if (body.status !== undefined) {
      return NextResponse.json({ error: "Trades can only move from open to closed." }, { status: 400 });
    }

    const changed = (data.isPublic !== undefined && data.isPublic !== existing.isPublic)
      || (data.currentPrice !== undefined && data.currentPrice !== existing.currentPrice)
      || (data.stopLoss !== undefined && data.stopLoss !== existing.stopLoss)
      || (data.takeProfit !== undefined && data.takeProfit !== existing.takeProfit)
      || (data.status !== undefined && data.status !== existing.status)
      || (data.exitPrice !== undefined && data.exitPrice !== existing.exitPrice)
      || (data.pnl !== undefined && data.pnl !== existing.pnl);
    if (!changed) return NextResponse.json({ trade: existing });
    data.updatedAt = new Date(Math.max(Date.now(), existing.updatedAt.getTime() + 1));

    const trade = await prisma.journalTrade.update({ where: { id }, data });
    return NextResponse.json({ trade });
  } catch (error) {
    console.error("JOURNAL PATCH ERROR:", error);
    return NextResponse.json({ error: "Unable to update this trade." }, { status: 500 });
  }
}
