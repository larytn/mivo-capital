import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { TRADING_RULES } from "@/lib/trading-rules";

export async function POST(request: NextRequest) {
  try {
    const { transaction_id, tx_ref } = await request.json();

    if (!transaction_id || !tx_ref) {
      return NextResponse.json(
        { error: "Missing transaction information." },
        { status: 400 }
      );
    }

    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = verifyToken(token) as {
      id: string;
    } | null;

    if (!payload) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    /*
     * VERIFY FLUTTERWAVE PAYMENT
     */

    const verifyResponse = await fetch(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      {
        headers: {
          Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
        },
      }
    );

    const verifyData = await verifyResponse.json();

    if (
      verifyData.status !== "success" ||
      verifyData.data?.status !== "successful"
    ) {
      return NextResponse.json(
        { error: "Payment not successful." },
        { status: 400 }
      );
    }

    /*
     * FIND PAYMENT
     */

    const payment = await prisma.payment.findUnique({
      where: {
        txRef: tx_ref,
      },
      include: {
        challenge: true,
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found." },
        { status: 404 }
      );
    }

    if (payment.userId !== payload.id) {
      return NextResponse.json(
        { error: "Unauthorized payment." },
        { status: 403 }
      );
    }

    /*
     * ALREADY PROCESSED
     */

    if (payment.status === "SUCCESS") {
      return NextResponse.json({
        status: "success",
        challenge: payment.challenge
          ? {
              id: payment.challenge.id,
              account: payment.challenge.account,
              type: payment.challenge.type,
              accountType: payment.challenge.accountType,
              stage: payment.challenge.stage,
              status: payment.challenge.status,
            }
          : null,
      });
    }

    /*
     * VERIFY AMOUNT
     */

    const paidAmount = Number(verifyData.data?.amount);
    const expectedAmount = Number(payment.amount);

    if (
      !Number.isFinite(paidAmount) ||
      !Number.isFinite(expectedAmount) ||
      paidAmount !== expectedAmount
    ) {
      return NextResponse.json(
        {
          error: "Payment amount does not match the order.",
        },
        { status: 400 }
      );
    }

    /*
     * PRODUCT RULES
     */

    let accountType:
      | "THREE_STEP"
      | "TWO_STEP"
      | "ONE_STEP"
      | "INSTANT";

    let stage: "PHASE_1" | "FUNDED";

    let profitTarget: number;
    let minimumTradeDays: number;
    let dailyDrawdown: number;
    let maxDrawdown: number;

    if (payment.challengeType === "Three-Step Challenge") {
      const rules = TRADING_RULES.THREE_STEP.PHASE_1;

      accountType = "THREE_STEP";
      stage = "PHASE_1";
      profitTarget = rules.profitTarget;
      minimumTradeDays = rules.minimumTradingDays;
      dailyDrawdown = rules.dailyDrawdown;
      maxDrawdown = rules.maxDrawdown;
    } else if (
      payment.challengeType === "Two-Step Challenge"
    ) {
      const rules = TRADING_RULES.TWO_STEP.PHASE_1;

      accountType = "TWO_STEP";
      stage = "PHASE_1";
      profitTarget = rules.profitTarget;
      minimumTradeDays = rules.minimumTradingDays;
      dailyDrawdown = rules.dailyDrawdown;
      maxDrawdown = rules.maxDrawdown;
    } else if (
      payment.challengeType === "One-Step Challenge"
    ) {
      const rules = TRADING_RULES.ONE_STEP.PHASE_1;

      accountType = "ONE_STEP";
      stage = "PHASE_1";
      profitTarget = rules.profitTarget;
      minimumTradeDays = rules.minimumTradingDays;
      dailyDrawdown = rules.dailyDrawdown;
      maxDrawdown = rules.maxDrawdown;
    } else if (
      payment.challengeType === "Instant Funding"
    ) {
      const rules = TRADING_RULES.INSTANT.FUNDED;

      accountType = "INSTANT";
      stage = "FUNDED";
      profitTarget = 0;
      minimumTradeDays = rules.minimumTradingDays;
      dailyDrawdown = rules.dailyDrawdown;
      maxDrawdown = rules.maxDrawdown;
    } else {
      return NextResponse.json(
        { error: "Invalid challenge type." },
        { status: 400 }
      );
    }

    /*
     * ACCOUNT SIZE
     */

    const accountBalance = Number(
      payment.accountSize.replace(/[$,]/g, "")
    );

    if (
      !Number.isFinite(accountBalance) ||
      accountBalance <= 0
    ) {
      return NextResponse.json(
        { error: "Invalid account size." },
        { status: 400 }
      );
    }

    /*
     * FIND AVAILABLE MT5 ACCOUNT
     */

    const poolAccount =
      await prisma.tradingAccountPool.findFirst({
        where: {
          status: "AVAILABLE",
          accountSize: accountBalance,
          accountType,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

    /*
     * CREATE + ASSIGN
     */

    const now = new Date();

    const challenge = await prisma.$transaction(
      async (tx) => {
        /*
         * CREATE CHALLENGE
         */

        const createdChallenge =
          await tx.challenge.create({
            data: {
              account: payment.accountSize,
              price: payment.amount,
              type: payment.challengeType,

              accountType,
              stage,

              /*
               * ACTIVE immediately if an MT5
               * account is available.
               *
               * Otherwise stays PENDING.
               */

              status: poolAccount
                ? "ACTIVE"
                : "PENDING",

              profitTarget,
              dailyDrawdown,
              maxDrawdown,
              minimumTradeDays,

              userId: payment.userId,

              /*
               * MT5 ACCOUNT
               */

              platform: poolAccount?.platform ?? null,
              broker: poolAccount?.broker ?? null,
              server: poolAccount?.server ?? null,

              mt5Login:
                poolAccount?.mt5Login ?? null,

              mt5Password:
                poolAccount?.mt5Password ?? null,

              investorPassword:
                poolAccount?.investorPassword ?? null,

              metaApiAccountId:
                poolAccount?.metaApiAccountId ?? null,

              assignedAt:
                poolAccount ? now : null,

              /*
               * ACCOUNT VALUES
               */

              startingBalance: poolAccount
                ? accountBalance
                : 0,

              currentBalance: poolAccount
                ? accountBalance
                : 0,

              currentEquity: poolAccount
                ? accountBalance
                : 0,

              profit: 0,
              withdrawableProfit: 0,
              tradingDays: 0,

              breachReason: null,

              dailyStartingBalance: poolAccount
                ? accountBalance
                : null,

              dailyStartingEquity: poolAccount
                ? accountBalance
                : null,

              lastDailyReset:
                poolAccount ? now : null,
            },
          });

        /*
         * RESERVE POOL ACCOUNT
         */

        if (poolAccount) {
          const reserved =
            await tx.tradingAccountPool.updateMany({
              where: {
                id: poolAccount.id,
                status: "AVAILABLE",
              },
              data: {
                status: "ASSIGNED",
                challengeId: createdChallenge.id,
                assignedAt: now,
              },
            });

          if (reserved.count !== 1) {
            throw new Error(
              "MT5 account was assigned to another customer. Please retry."
            );
          }
        }

        /*
         * PAYMENT SUCCESS
         */

        await tx.payment.update({
          where: {
            id: payment.id,
          },
          data: {
            status: "SUCCESS",

            flutterwaveTransactionId:
              String(transaction_id),

            paymentMethod:
              verifyData.data?.payment_type ?? null,

            challengeId:
              createdChallenge.id,
          },
        });

        /*
         * PROMO USE
         */

        if (payment.promoCode) {
          const promo = await tx.promoCode.findFirst({
            where: {
              code: payment.promoCode,
            },
          });

          if (promo) {
            await tx.promoCode.update({
              where: {
                id: promo.id,
              },
              data: {
                usedCount: {
                  increment: 1,
                },
              },
            });
          }
        }

        return createdChallenge;
      }
    );

    return NextResponse.json({
      status: "success",

      accountAssigned: Boolean(poolAccount),

      challenge: {
        id: challenge.id,
        account: challenge.account,
        type: challenge.type,
        accountType: challenge.accountType,
        stage: challenge.stage,
        status: challenge.status,

        mt5Login: challenge.mt5Login,
        server: challenge.server,
      },
    });
  } catch (error: any) {
    console.error("Verify payment error:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Payment verification failed.",
      },
      { status: 500 }
    );
  }
}