import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-mivo-api-key");

    if (
      !process.env.TRADING_SYNC_API_KEY ||
      apiKey !== process.env.TRADING_SYNC_API_KEY
    ) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { challengeId } = await request.json();

    if (!challengeId) {
      return NextResponse.json(
        { error: "Challenge ID is required." },
        { status: 400 }
      );
    }

    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge not found." },
        { status: 404 }
      );
    }

    if (challenge.status !== "PENDING") {
      return NextResponse.json(
        { error: "Challenge is not pending." },
        { status: 400 }
      );
    }

    const accountBalance = Number(
      challenge.account.replace(/[$,]/g, "")
    );

    if (!Number.isFinite(accountBalance) || accountBalance <= 0) {
      return NextResponse.json(
        { error: "Invalid challenge account size." },
        { status: 400 }
      );
    }

    const poolAccount =
      await prisma.tradingAccountPool.findFirst({
        where: {
          status: "AVAILABLE",
          accountSize: accountBalance,
          accountType: challenge.accountType,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

    if (!poolAccount) {
      return NextResponse.json(
        {
          success: false,
          error: "No matching MT5 account available in pool.",
        },
        { status: 409 }
      );
    }

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const reserved =
        await tx.tradingAccountPool.updateMany({
          where: {
            id: poolAccount.id,
            status: "AVAILABLE",
          },
          data: {
            status: "ASSIGNED",
            challengeId: challenge.id,
            assignedAt: now,
          },
        });

      if (reserved.count !== 1) {
        throw new Error(
          "Account was assigned to another challenge. Try again."
        );
      }

      const updatedChallenge =
        await tx.challenge.update({
          where: {
            id: challenge.id,
          },
          data: {
            platform: poolAccount.platform,
            broker: poolAccount.broker,
            server: poolAccount.server,

            mt5Login: poolAccount.mt5Login,
            mt5Password: poolAccount.mt5Password,
            investorPassword:
              poolAccount.investorPassword,

            metaApiAccountId:
              poolAccount.metaApiAccountId,

            assignedAt: now,
            status: "ACTIVE",

            startingBalance: accountBalance,
            currentBalance: accountBalance,
            currentEquity: accountBalance,

            profit: 0,
            withdrawableProfit: 0,
            tradingDays: 0,

            breachReason: null,

            dailyStartingBalance: accountBalance,
            dailyStartingEquity: accountBalance,
            lastDailyReset: now,
          },
        });

      return updatedChallenge;
    });

    return NextResponse.json({
      success: true,
      message: "Trading account assigned automatically.",
      account: {
        challengeId: result.id,
        accountType: result.accountType,
        stage: result.stage,
        status: result.status,
        mt5Login: result.mt5Login,
        server: result.server,
        startingBalance: result.startingBalance,
      },
    });
  } catch (error: any) {
    console.error("AUTO ASSIGN ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Automatic account assignment failed.",
      },
      { status: 500 }
    );
  }
}