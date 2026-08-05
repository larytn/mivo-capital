import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { TRADING_RULES } from "@/lib/trading-rules";

export async function POST(request: NextRequest) {
  try {
    const { transaction_id, tx_ref } =
      await request.json();

    if (!transaction_id || !tx_ref) {
      return NextResponse.json(
        {
          error:
            "Missing transaction information.",
        },
        { status: 400 }
      );
    }

    /*
     * AUTHENTICATION
     */

    const token =
      request.cookies.get("token")?.value;

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
     * VERIFY PAYMENT WITH FLUTTERWAVE
     */

    const verifyResponse = await fetch(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      {
        headers: {
          Authorization:
            `Bearer ${process.env.FLW_SECRET_KEY}`,
        },
      }
    );

    const verifyData =
      await verifyResponse.json();

    if (
      verifyData.status !== "success" ||
      verifyData.data?.status !==
        "successful"
    ) {
      return NextResponse.json(
        {
          error:
            "Payment not successful.",
        },
        { status: 400 }
      );
    }

    /*
     * FIND PAYMENT
     */

    const payment =
      await prisma.payment.findUnique({
        where: {
          txRef: tx_ref,
        },
      });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found." },
        { status: 404 }
      );
    }

    /*
     * SECURITY CHECK
     *
     * Payment must belong to the
     * currently authenticated user.
     */

    if (payment.userId !== payload.id) {
      return NextResponse.json(
        { error: "Unauthorized payment." },
        { status: 403 }
      );
    }

    /*
     * PREVENT DUPLICATE CHALLENGES
     */

    if (payment.status === "SUCCESS") {
      return NextResponse.json({
        status: "success",
      });
    }

   /*
 * PRODUCT CONFIGURATION
 *
 * Trading rules come directly from
 * lib/trading-rules.ts.
 */

let accountType:
  | "THREE_STEP"
  | "TWO_STEP"
  | "ONE_STEP"
  | "INSTANT";

let stage:
  | "PHASE_1"
  | "FUNDED";

let profitTarget: number;
let minimumTradeDays: number;
let dailyDrawdown: number;
let maxDrawdown: number;

/*
 * THREE-STEP
 */
if (
  payment.challengeType ===
  "Three-Step Challenge"
) {
  const rules =
    TRADING_RULES.THREE_STEP.PHASE_1;

  accountType = "THREE_STEP";
  stage = "PHASE_1";

  profitTarget = rules.profitTarget;
  minimumTradeDays =
    rules.minimumTradingDays;

  dailyDrawdown =
    rules.dailyDrawdown;

  maxDrawdown =
    rules.maxDrawdown;
}

/*
 * TWO-STEP
 */
else if (
  payment.challengeType ===
  "Two-Step Challenge"
) {
  const rules =
    TRADING_RULES.TWO_STEP.PHASE_1;

  accountType = "TWO_STEP";
  stage = "PHASE_1";

  profitTarget = rules.profitTarget;
  minimumTradeDays =
    rules.minimumTradingDays;

  dailyDrawdown =
    rules.dailyDrawdown;

  maxDrawdown =
    rules.maxDrawdown;
}

/*
 * ONE-STEP
 */
else if (
  payment.challengeType ===
  "One-Step Challenge"
) {
  const rules =
    TRADING_RULES.ONE_STEP.PHASE_1;

  accountType = "ONE_STEP";
  stage = "PHASE_1";

  profitTarget = rules.profitTarget;
  minimumTradeDays =
    rules.minimumTradingDays;

  dailyDrawdown =
    rules.dailyDrawdown;

  maxDrawdown =
    rules.maxDrawdown;
}

/*
 * INSTANT FUNDING
 */
else if (
  payment.challengeType ===
  "Instant Funding"
) {
  const rules =
    TRADING_RULES.INSTANT.FUNDED;

  accountType = "INSTANT";
  stage = "FUNDED";

  profitTarget = 0;
  minimumTradeDays =
    rules.minimumTradingDays;

  dailyDrawdown =
    rules.dailyDrawdown;

  maxDrawdown =
    rules.maxDrawdown;
}

/*
 * UNKNOWN PRODUCT
 */
else {
  return NextResponse.json(
    {
      error: "Invalid challenge type.",
    },
    { status: 400 }
  );
}

    /*
     * IMPORTANT PAYMENT VALIDATION
     *
     * Do not trust only the transaction
     * being successful. It must also match
     * the payment record Mivo created.
     */

    const paidAmount = Number(
      verifyData.data?.amount
    );

    const expectedAmount = Number(
      payment.amount
    );

    if (
      !Number.isFinite(paidAmount) ||
      !Number.isFinite(expectedAmount) ||
      paidAmount !== expectedAmount
    ) {
      return NextResponse.json(
        {
          error:
            "Payment amount does not match the order.",
        },
        { status: 400 }
      );
    }

    /*
     * CREATE CHALLENGE + UPDATE PAYMENT
     *
     * Both operations happen together.
     */

    const challenge = await prisma.$transaction(
  async (tx) => {
    const createdChallenge =
            await tx.challenge.create({
              data: {
                account:
                  payment.accountSize,

                price:
                  payment.amount,

                type:
                  payment.challengeType,

                accountType,
                stage,
                status: "PENDING",

                /*
                 * PRODUCT RULES
                 */

                profitTarget,

               dailyDrawdown,
maxDrawdown,
                minimumTradeDays,

                userId:
                  payment.userId,
              },
            });

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
 * COUNT PROMO CODE USE
 * Only after successful payment.
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

  challenge: {
    id: challenge.id,

    account:
      challenge.account,

    type:
      challenge.type,

    accountType:
      challenge.accountType,

    stage:
      challenge.stage,

    status:
      challenge.status,
  },
});
} catch (error: any) {
  console.error(
    "Verify payment error:",
    error
  );

  return NextResponse.json(
    {
      error:
        error.message ||
        "Payment verification failed.",
    },
    { status: 500 }
  );
}
}