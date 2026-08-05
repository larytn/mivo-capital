import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const {
      challengeId,
      platform,
      broker,
      server,
      mt5Login,
      mt5Password,
      investorPassword,
    } = await request.json();

    if (!challengeId) {
      return NextResponse.json(
        {
          error:
            "Challenge ID is required.",
        },
        { status: 400 }
      );
    }

    /*
     * FIND ACCOUNT
     */

    const challenge =
      await prisma.challenge.findUnique({
        where: {
          id: challengeId,
        },
      });

    if (!challenge) {
      return NextResponse.json(
        {
          error:
            "Challenge not found.",
        },
        { status: 404 }
      );
    }

    /*
     * ACCOUNT SIZE
     */

    const accountBalance =
      Number(
        challenge.account.replace(
          /[$,]/g,
          ""
        )
      );

    if (
      !Number.isFinite(
        accountBalance
      ) ||
      accountBalance <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid challenge account size.",
        },
        { status: 400 }
      );
    }

    /*
     * ACCOUNT RULES
     *
     * These are the INITIAL rules used
     * whenever an account is assigned
     * or completely reset.
     *
     * ONE_STEP:
     *   PHASE_1 → 8%
     *
     * TWO_STEP:
     *   PHASE_1 → 8%
     *
     * INSTANT:
     *   FUNDED → 0%
     *
     * TWO_STEP Phase 2 target (5%)
     * is handled later by the
     * progression service.
     */

    let initialStage:
      | "PHASE_1"
      | "FUNDED";

    let initialProfitTarget:
      number;

    let initialMinimumTradeDays:
      number;

    switch (
      challenge.accountType
    ) {
      case "ONE_STEP":
        initialStage =
          "PHASE_1";

        initialProfitTarget =
          8;

        initialMinimumTradeDays =
          5;

        break;

      case "TWO_STEP":
        initialStage =
          "PHASE_1";

        initialProfitTarget =
          8;

        initialMinimumTradeDays =
          5;

        break;

      case "INSTANT":
        initialStage =
          "FUNDED";

        initialProfitTarget =
          0;

        initialMinimumTradeDays =
          0;

        break;

      default:
        return NextResponse.json(
          {
            error:
              `Unsupported account type: ${challenge.accountType}`,
          },
          { status: 400 }
        );
    }

    const now = new Date();

    /*
     * ASSIGN + RESET ACCOUNT
     */

    const updatedChallenge =
      await prisma.$transaction(
        async (tx) => {
          /*
           * Remove trading history from
           * the previous lifecycle.
           */

          await tx.trade.deleteMany({
            where: {
              challengeId,
            },
          });

          /*
           * Reset the account back to
           * its correct initial state.
           */

          return tx.challenge.update({
            where: {
              id: challengeId,
            },

            data: {
              platform,
              broker,
              server,

              mt5Login:
                mt5Login
                  ? String(
                      mt5Login
                    )
                  : null,

              mt5Password,
              investorPassword,

              assignedAt:
                now,

              /*
               * ARCHITECTURE
               */

              stage:
                initialStage,

              status:
                "ACTIVE",

              /*
               * INITIAL RULES
               */

              profitTarget:
                initialProfitTarget,

              minimumTradeDays:
                initialMinimumTradeDays,

              /*
               * ACCOUNT VALUES
               */

              startingBalance:
                accountBalance,

              currentBalance:
                accountBalance,

              currentEquity:
                accountBalance,

              profit:
                0,

              withdrawableProfit:
                0,

              tradingDays:
                0,

              breachReason:
                null,

              /*
               * DAILY DRAWDOWN
               * REFERENCE
               */

              dailyStartingBalance:
                accountBalance,

              dailyStartingEquity:
                accountBalance,

              lastDailyReset:
                now,
            },
          });
        }
      );

    /*
     * RESPONSE
     */

    return NextResponse.json({
      success: true,

      message:
        challenge.accountType ===
        "INSTANT"
          ? "Instant funded account assigned successfully."
          : "Trading account assigned and evaluation started successfully.",

      account: {
        id:
          updatedChallenge.id,

        accountType:
          updatedChallenge.accountType,

        stage:
          updatedChallenge.stage,

        status:
          updatedChallenge.status,

        mt5Login:
          updatedChallenge.mt5Login,

        startingBalance:
          updatedChallenge.startingBalance,

        currentBalance:
          updatedChallenge.currentBalance,

        currentEquity:
          updatedChallenge.currentEquity,

        profitTarget:
          updatedChallenge.profitTarget,

        minimumTradeDays:
          updatedChallenge.minimumTradeDays,

        dailyDrawdown:
          updatedChallenge.dailyDrawdown,

        maxDrawdown:
          updatedChallenge.maxDrawdown,

        profit:
          updatedChallenge.profit,

        tradingDays:
          updatedChallenge.tradingDays,

        breachReason:
          updatedChallenge.breachReason,
      },
    });
  } catch (error: any) {
    console.error(
      "Assign account error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Failed to assign account.",
      },
      { status: 500 }
    );
  }
}