import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      challengeId,
      ticket,
      symbol,
      type,
      volume,
      openPrice,
      closePrice,
      stopLoss,
      takeProfit,
      openedAt,
      closedAt,
      commission,
      swap,
      profit,
    } = body;

    if (!challengeId || !ticket || !symbol || !openedAt) {
      return NextResponse.json(
        { error: "Missing required trade data." },
        { status: 400 }
      );
    }

    const challenge = await prisma.challenge.findUnique({
      where: {
        id: challengeId,
      },
    });

    if (!challenge) {
      return NextResponse.json(
        { error: "Trading account not found." },
        { status: 404 }
      );
    }

    const trade = await prisma.trade.upsert({
      where: {
        challengeId_ticket: {
          challengeId,
          ticket: String(ticket),
        },
      },

      create: {
        challengeId,
        ticket: String(ticket),
        symbol,
        type: type ?? null,
        volume: Number(volume ?? 0),

        openPrice:
          openPrice != null ? Number(openPrice) : null,

        closePrice:
          closePrice != null ? Number(closePrice) : null,

        stopLoss:
          stopLoss != null ? Number(stopLoss) : null,

        takeProfit:
          takeProfit != null ? Number(takeProfit) : null,

        openedAt: new Date(openedAt),

        closedAt:
          closedAt ? new Date(closedAt) : null,

        commission: Number(commission ?? 0),
        swap: Number(swap ?? 0),
        profit: Number(profit ?? 0),
      },

      update: {
        symbol,
        type: type ?? null,
        volume: Number(volume ?? 0),

        openPrice:
          openPrice != null ? Number(openPrice) : null,

        closePrice:
          closePrice != null ? Number(closePrice) : null,

        stopLoss:
          stopLoss != null ? Number(stopLoss) : null,

        takeProfit:
          takeProfit != null ? Number(takeProfit) : null,

        openedAt: new Date(openedAt),

        closedAt:
          closedAt ? new Date(closedAt) : null,

        commission: Number(commission ?? 0),
        swap: Number(swap ?? 0),
        profit: Number(profit ?? 0),
      },
    });

    return NextResponse.json({
      success: true,
      trade,
    });
  } catch (error: any) {
    console.error("Trade sync error:", error);

    return NextResponse.json(
      {
        error:
          error.message || "Failed to synchronize trade.",
      },
      { status: 500 }
    );
  }
}