import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const {
      challengeId,
      balance,
      equity,
      recordedAt,
    } = await request.json();

    if (!challengeId) {
      return NextResponse.json(
        { error: "Challenge ID is required." },
        { status: 400 }
      );
    }

    const accountBalance = Number(balance);
    const accountEquity = Number(equity);

    if (
      !Number.isFinite(accountBalance) ||
      !Number.isFinite(accountEquity)
    ) {
      return NextResponse.json(
        { error: "Invalid balance or equity." },
        { status: 400 }
      );
    }

    const challenge =
      await prisma.challenge.findUnique({
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

    const snapshot =
      await prisma.accountSnapshot.create({
        data: {
          challengeId,
          balance: accountBalance,
          equity: accountEquity,
          recordedAt: recordedAt
            ? new Date(recordedAt)
            : new Date(),
        },
      });

    return NextResponse.json({
      success: true,
      snapshot,
    });
  } catch (error: any) {
    console.error(
      "Account snapshot error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Failed to save account snapshot.",
      },
      { status: 500 }
    );
  }
}