import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateTradingAccount } from "@/lib/trading-engine";
import { TRADING_RULES } from "@/lib/trading-rules";

type IncomingTrade = {
  ticket: string | number;
  symbol: string;

  type?: string | null;
  volume?: number;

  openPrice?: number | null;
  closePrice?: number | null;

  stopLoss?: number | null;
  takeProfit?: number | null;

  openedAt: string;
  closedAt?: string | null;

  commission?: number;
  swap?: number;
  profit?: number;
};

function safeNumber(
  value: unknown,
  fallback = 0
) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function optionalNumber(
  value: unknown
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

export async function POST(
  request: NextRequest
) {
  try {
    /*
     * SECURITY
     */

    const apiKey =
      request.headers.get(
        "x-mivo-api-key"
      );

    if (
      !process.env
        .TRADING_SYNC_API_KEY ||
      apiKey !==
        process.env
          .TRADING_SYNC_API_KEY
    ) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * INCOMING BROKER / MT5 DATA
     */

    const {
      mt5Login,
      currentBalance,
      currentEquity,
      trades = [],
    } = await request.json();

    if (!mt5Login) {
      return NextResponse.json(
        {
          error:
            "MT5 login is required.",
        },
        {
          status: 400,
        }
      );
    }

    const balance = Number(
      currentBalance
    );

    const equity = Number(
      currentEquity
    );

    if (
      !Number.isFinite(balance) ||
      !Number.isFinite(equity) ||
      balance < 0 ||
      equity < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid trading data.",
        },
        {
          status: 400,
        }
      );
    }

    if (!Array.isArray(trades)) {
      return NextResponse.json(
        {
          error:
            "Trades must be an array.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * FIND MIVO ACCOUNT
     */

    const existing =
      await prisma.challenge.findFirst({
        where: {
          mt5Login:
            String(mt5Login),
        },
      });

    if (!existing) {
      return NextResponse.json(
        {
          error:
            "Trading account not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * TERMINAL ACCOUNT
     */

    if (
      existing.status === "FAILED"
    ) {
      return NextResponse.json(
        {
          error:
            "Trading account has failed.",

          account:
            accountResponse(
              existing
            ),
        },
        {
          status: 409,
        }
      );
    }

    /*
     * PENDING ACCOUNT
     */

    if (
      existing.status === "PENDING"
    ) {
      return NextResponse.json(
        {
          error:
            "Trading account is not active yet.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * SAVE / UPDATE TRADES
     *
     * Broker data will eventually feed
     * this automatically.
     */

    for (
      const trade of
      trades as IncomingTrade[]
    ) {
      if (
        trade.ticket ===
          undefined ||
        trade.ticket === null ||
        !trade.symbol ||
        !trade.openedAt
      ) {
        continue;
      }

      const openedAt =
        new Date(
          trade.openedAt
        );

      if (
        Number.isNaN(
          openedAt.getTime()
        )
      ) {
        continue;
      }

      let closedAt:
        | Date
        | null = null;

      if (trade.closedAt) {
        const parsedClosedAt =
          new Date(
            trade.closedAt
          );

        if (
          !Number.isNaN(
            parsedClosedAt.getTime()
          )
        ) {
          closedAt =
            parsedClosedAt;
        }
      }

      const ticket =
        String(trade.ticket);

      const tradeProfit =
        safeNumber(
          trade.profit
        );

      const commission =
        safeNumber(
          trade.commission
        );

      const swap =
        safeNumber(
          trade.swap
        );

      const volume =
        safeNumber(
          trade.volume
        );

      await prisma.trade.upsert({
        where: {
          challengeId_ticket: {
            challengeId:
              existing.id,

            ticket,
          },
        },

        update: {
          symbol:
            trade.symbol,

          type:
            trade.type ?? null,

          volume,

          openPrice:
            optionalNumber(
              trade.openPrice
            ),

          closePrice:
            optionalNumber(
              trade.closePrice
            ),

          stopLoss:
            optionalNumber(
              trade.stopLoss
            ),

          takeProfit:
            optionalNumber(
              trade.takeProfit
            ),

          openedAt,

          closedAt,

          commission,

          swap,

          profit:
            tradeProfit,
        },

        create: {
          challengeId:
            existing.id,

          ticket,

          symbol:
            trade.symbol,

          type:
            trade.type ?? null,

          volume,

          openPrice:
            optionalNumber(
              trade.openPrice
            ),

          closePrice:
            optionalNumber(
              trade.closePrice
            ),

          stopLoss:
            optionalNumber(
              trade.stopLoss
            ),

          takeProfit:
            optionalNumber(
              trade.takeProfit
            ),

          openedAt,

          closedAt,

          commission,

          swap,

          profit:
            tradeProfit,
        },
      });
    }

    /*
     * AUTOMATIC TRADING DAYS
     *
     * Count unique UTC days that
     * contain closed trades.
     */

    const savedTrades =
      await prisma.trade.findMany({
        where: {
          challengeId:
            existing.id,

          closedAt: {
            not: null,
          },
        },

        select: {
          openedAt: true,
        },
      });

    const uniqueTradingDays =
      new Set(
        savedTrades.map(
          (trade) => {
            const date =
              trade.openedAt;

            return [
              date.getUTCFullYear(),

              String(
                date.getUTCMonth() +
                  1
              ).padStart(
                2,
                "0"
              ),

              String(
                date.getUTCDate()
              ).padStart(
                2,
                "0"
              ),
            ].join("-");
          }
        )
      );

    const tradingDays =
      uniqueTradingDays.size;

    /*
     * CENTRAL TRADING ENGINE
     */

    const evaluation =
      evaluateTradingAccount({
        accountType:
          existing.accountType,

        stage:
          existing.stage,

        status:
          existing.status,

        startingBalance:
          existing.startingBalance,

        currentBalance:
          balance,

        currentEquity:
          equity,

        profitTarget:
          existing.profitTarget,

        dailyDrawdown:
          existing.dailyDrawdown,

        maxDrawdown:
          existing.maxDrawdown,

        minimumTradeDays:
          existing.minimumTradeDays,

        tradingDays,

        dailyStartingBalance:
          existing.dailyStartingBalance,

        dailyStartingEquity:
          existing.dailyStartingEquity,

        lastDailyReset:
          existing.lastDailyReset,

        breachReason:
          existing.breachReason,
      });

    /*
     * SAVE PERFORMANCE SNAPSHOT
     *
     * Used by account performance graph.
     */

    await prisma.accountSnapshot.create({
      data: {
        challengeId:
          existing.id,

        balance,

        equity,

        recordedAt:
          new Date(),
      },
    });

    /*
     * ACCOUNT FAILED
     */

    if (
      evaluation.status ===
      "FAILED"
    ) {
      const failed =
        await prisma.challenge.update({
          where: {
            id:
              existing.id,
          },

          data: {
            status:
              "FAILED",

            currentBalance:
              balance,

            currentEquity:
              equity,

            profit:
              evaluation.profit,

            tradingDays,

            breachReason:
              evaluation.breachReason,

            dailyStartingBalance:
              evaluation
                .dailyStartingBalance,

            dailyStartingEquity:
              evaluation
                .dailyStartingEquity,

            lastDailyReset:
              evaluation
                .lastDailyReset,
          },
        });

      return NextResponse.json({
        success: true,

        progression:
          "ACCOUNT_FAILED",

        account:
          accountResponse(
            failed
          ),

        tradingDays,

        evaluation,
      });
    }

    /*
     * ONE STEP
     *
     * PHASE 1 -> FUNDED
     */

    if (
      existing.accountType ===
        "ONE_STEP" &&
      existing.stage ===
        "PHASE_1" &&
      evaluation.status ===
        "PASSED"
    ) {
      const funded =
        await startFundedAccount(
          existing.id,
          existing.startingBalance
        );

      return NextResponse.json({
        success: true,

        progression:
          "FUNDED_ACCOUNT_STARTED",

        previousStage:
          "PHASE_1",

        account:
          accountResponse(
            funded
          ),
      });
    }

    /*
 * THREE STEP
 *
 * PHASE 1 -> PHASE 2
 */

if (
  existing.accountType === "THREE_STEP" &&
  existing.stage === "PHASE_1" &&
  evaluation.status === "PASSED"
) {
  const phase2 = await startThreeStepPhase(
    existing.id,
    existing.startingBalance,
    "PHASE_2"
  );

  return NextResponse.json({
    success: true,
    progression: "PHASE_2_STARTED",
    previousStage: "PHASE_1",
    account: accountResponse(phase2),
  });
}

/*
 * THREE STEP
 *
 * PHASE 2 -> PHASE 3
 */

if (
  existing.accountType === "THREE_STEP" &&
  existing.stage === "PHASE_2" &&
  evaluation.status === "PASSED"
) {
  const phase3 = await startThreeStepPhase(
    existing.id,
    existing.startingBalance,
    "PHASE_3"
  );

  return NextResponse.json({
    success: true,
    progression: "PHASE_3_STARTED",
    previousStage: "PHASE_2",
    account: accountResponse(phase3),
  });
}

/*
 * THREE STEP
 *
 * PHASE 3 -> FUNDED
 */

if (
  existing.accountType === "THREE_STEP" &&
  existing.stage === "PHASE_3" &&
  evaluation.status === "PASSED"
) {
  const funded = await startFundedAccount(
    existing.id,
    existing.startingBalance
  );

  return NextResponse.json({
    success: true,
    progression: "FUNDED_ACCOUNT_STARTED",
    previousStage: "PHASE_3",
    account: accountResponse(funded),
  });
}

    /*
     * TWO STEP
     *
     * PHASE 1 -> PHASE 2
     */

    if (
      existing.accountType ===
        "TWO_STEP" &&
      existing.stage ===
        "PHASE_1" &&
      evaluation.status ===
        "PASSED"
    ) {
      const phase2 =
        await startPhase2(
          existing.id,
          existing.startingBalance
        );

      return NextResponse.json({
        success: true,

        progression:
          "PHASE_2_STARTED",

        previousStage:
          "PHASE_1",

        account:
          accountResponse(
            phase2
          ),
      });
    }

    /*
     * TWO STEP
     *
     * PHASE 2 -> FUNDED
     */

    if (
      existing.accountType ===
        "TWO_STEP" &&
      existing.stage ===
        "PHASE_2" &&
      evaluation.status ===
        "PASSED"
    ) {
      const funded =
        await startFundedAccount(
          existing.id,
          existing.startingBalance
        );

      return NextResponse.json({
        success: true,

        progression:
          "FUNDED_ACCOUNT_STARTED",

        previousStage:
          "PHASE_2",

        account:
          accountResponse(
            funded
          ),
      });
    }

    /*
     * NORMAL AUTOMATIC UPDATE
     */

    const challenge =
      await prisma.challenge.update({
        where: {
          id:
            existing.id,
        },

        data: {
          status:
            evaluation.status,

          currentBalance:
            balance,

          currentEquity:
            equity,

          profit:
            evaluation.profit,

          tradingDays,

          breachReason:
            evaluation.breachReason,

          dailyStartingBalance:
            evaluation
              .dailyStartingBalance,

          dailyStartingEquity:
            evaluation
              .dailyStartingEquity,

          lastDailyReset:
            evaluation
              .lastDailyReset,
        },
      });

    return NextResponse.json({
      success: true,

      progression: null,

      account:
        accountResponse(
          challenge
        ),

      tradesReceived:
        trades.length,

      tradingDays,

      evaluation,
    });
  } catch (error: any) {
    console.error(
      "Trading sync error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Trading sync failed.",
      },
      {
        status: 500,
      }
    );
  }
}

async function startThreeStepPhase(
  challengeId: string,
  startingBalance: number,
  stage: "PHASE_2" | "PHASE_3"
) {
  const now = new Date();

  const rules =
    stage === "PHASE_2"
      ? TRADING_RULES.THREE_STEP.PHASE_2
      : TRADING_RULES.THREE_STEP.PHASE_3;

  return prisma.challenge.update({
    where: {
      id: challengeId,
    },

    data: {
      stage,
      status: "ACTIVE",

      profitTarget: rules.profitTarget,
      dailyDrawdown: rules.dailyDrawdown,
      maxDrawdown: rules.maxDrawdown,
      minimumTradeDays:
        rules.minimumTradingDays,

      currentBalance: startingBalance,
      currentEquity: startingBalance,
      profit: 0,
      withdrawableProfit: 0,
      tradingDays: 0,

      breachReason: null,
      dailyStartingBalance: startingBalance,
      dailyStartingEquity: startingBalance,
      lastDailyReset: now,
    },
  });
}

/*
 * START PHASE 2
 */

async function startPhase2(
  challengeId: string,
  startingBalance: number
) {
  const now = new Date();

  const rules =
    TRADING_RULES.TWO_STEP.PHASE_2;

  return prisma.challenge.update({
    where: {
      id: challengeId,
    },

    data: {
      stage: "PHASE_2",
      status: "ACTIVE",

      profitTarget: rules.profitTarget,
      dailyDrawdown: rules.dailyDrawdown,
      maxDrawdown: rules.maxDrawdown,
      minimumTradeDays:
        rules.minimumTradingDays,

      currentBalance: startingBalance,
      currentEquity: startingBalance,
      profit: 0,
      withdrawableProfit: 0,
      tradingDays: 0,

      breachReason: null,
      dailyStartingBalance: startingBalance,
      dailyStartingEquity: startingBalance,
      lastDailyReset: now,
    },
  });
}

/*
 * START FUNDED ACCOUNT
 */

async function startFundedAccount(
  challengeId: string,
  startingBalance: number
) {
  const now = new Date();

  const challenge =
    await prisma.challenge.findUnique({
      where: {
        id: challengeId,
      },
    });

  if (!challenge) {
    throw new Error("Challenge not found.");
  }

  let rules;

  switch (challenge.accountType) {
    case "THREE_STEP":
      rules =
        TRADING_RULES.THREE_STEP.FUNDED;
      break;

    case "TWO_STEP":
      rules =
        TRADING_RULES.TWO_STEP.FUNDED;
      break;

    case "ONE_STEP":
      rules =
        TRADING_RULES.ONE_STEP.FUNDED;
      break;

    case "INSTANT":
      rules =
        TRADING_RULES.INSTANT.FUNDED;
      break;

    default:
      throw new Error(
        "Invalid account type."
      );
  }

  return prisma.challenge.update({
    where: {
      id: challengeId,
    },

    data: {
      stage: "FUNDED",
      status: "ACTIVE",

      profitTarget: 0,
      dailyDrawdown:
        rules.dailyDrawdown,
      maxDrawdown:
        rules.maxDrawdown,
      minimumTradeDays:
        rules.minimumTradingDays,

      currentBalance: startingBalance,
      currentEquity: startingBalance,
      profit: 0,
      withdrawableProfit: 0,
      tradingDays: 0,

      breachReason: null,
      dailyStartingBalance:
        startingBalance,
      dailyStartingEquity:
        startingBalance,
      lastDailyReset: now,
    },
  });
}

/*
 * STANDARD ACCOUNT RESPONSE
 */

function accountResponse(
  account: {
    id: string;
    mt5Login: string | null;
    accountType: string;
    stage: string;
    status: string;
    profitTarget: number;
    currentBalance: number;
    currentEquity: number;
    profit: number;
    tradingDays: number;
    breachReason: string | null;
  }
) {
  return {
    id:
      account.id,

    mt5Login:
      account.mt5Login,

    accountType:
      account.accountType,

    stage:
      account.stage,

    status:
      account.status,

    profitTarget:
      account.profitTarget,

    currentBalance:
      account.currentBalance,

    currentEquity:
      account.currentEquity,

    profit:
      account.profit,

    tradingDays:
      account.tradingDays,

    breachReason:
      account.breachReason,
  };
}