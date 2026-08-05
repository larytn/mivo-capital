import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { TRADING_RULES } from "@/lib/trading-rules";

function sortObject(value: any): any {
  if (Array.isArray(value)) {
    return value.map(sortObject);
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = sortObject(value[key]);
        return result;
      }, {} as Record<string, any>);
  }

  return value;
}

export async function POST(request: NextRequest) {
  try {
    const ipnSecret =
      process.env.NOWPAYMENTS_IPN_SECRET;

    const apiKey =
      process.env.NOWPAYMENTS_API_KEY;

    if (!ipnSecret || !apiKey) {
      return NextResponse.json(
        { error: "NOWPayments is not configured." },
        { status: 500 }
      );
    }

    const signature =
      request.headers.get("x-nowpayments-sig");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature." },
        { status: 401 }
      );
    }

    const body = await request.json();

    /*
     * VERIFY IPN SIGNATURE
     */
    const expectedSignature = createHmac(
      "sha512",
      ipnSecret
    )
      .update(
        JSON.stringify(sortObject(body))
      )
      .digest("hex");

    const receivedBuffer =
      Buffer.from(signature, "hex");

    const expectedBuffer =
      Buffer.from(expectedSignature, "hex");

    if (
      receivedBuffer.length !==
        expectedBuffer.length ||
      !timingSafeEqual(
        receivedBuffer,
        expectedBuffer
      )
    ) {
      return NextResponse.json(
        { error: "Invalid signature." },
        { status: 401 }
      );
    }

    const {
      payment_id,
      payment_status,
      order_id,
    } = body;

    if (!payment_id || !order_id) {
      return NextResponse.json(
        { error: "Missing payment information." },
        { status: 400 }
      );
    }

    /*
     * IGNORE PAYMENT UPDATES THAT
     * ARE NOT FINISHED YET
     */
    if (payment_status !== "finished") {
      return NextResponse.json({
        status: "ignored",
      });
    }

    /*
     * VERIFY DIRECTLY WITH NOWPAYMENTS
     */
    const verifyResponse = await fetch(
      `https://api.nowpayments.io/v1/payment/${payment_id}`,
      {
        headers: {
          "x-api-key": apiKey,
        },
      }
    );

    const verifyData =
      await verifyResponse.json();

    if (
      !verifyResponse.ok ||
      verifyData.payment_status !== "finished"
    ) {
      return NextResponse.json(
        { error: "Payment verification failed." },
        { status: 400 }
      );
    }

    if (
      String(verifyData.order_id) !==
      String(order_id)
    ) {
      return NextResponse.json(
        { error: "Order reference mismatch." },
        { status: 400 }
      );
    }

    /*
     * FIND MIVO PAYMENT
     */
    const payment =
      await prisma.payment.findUnique({
        where: {
          txRef: String(order_id),
        },
      });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found." },
        { status: 404 }
      );
    }

    /*
     * PREVENT DUPLICATES
     */
    if (payment.status === "SUCCESS") {
      return NextResponse.json({
        status: "success",
      });
    }

    /*
     * PRODUCT RULES
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
    let dailyDrawdown: number;
    let maxDrawdown: number;
    let minimumTradeDays: number;

    if (
      payment.challengeType ===
      "Three-Step Challenge"
    ) {
      const rules =
        TRADING_RULES.THREE_STEP.PHASE_1;

      accountType = "THREE_STEP";
      stage = "PHASE_1";

      profitTarget = rules.profitTarget;
      dailyDrawdown = rules.dailyDrawdown;
      maxDrawdown = rules.maxDrawdown;
      minimumTradeDays =
        rules.minimumTradingDays;
    } else if (
      payment.challengeType ===
      "Two-Step Challenge"
    ) {
      const rules =
        TRADING_RULES.TWO_STEP.PHASE_1;

      accountType = "TWO_STEP";
      stage = "PHASE_1";

      profitTarget = rules.profitTarget;
      dailyDrawdown = rules.dailyDrawdown;
      maxDrawdown = rules.maxDrawdown;
      minimumTradeDays =
        rules.minimumTradingDays;
    } else if (
      payment.challengeType ===
      "One-Step Challenge"
    ) {
      const rules =
        TRADING_RULES.ONE_STEP.PHASE_1;

      accountType = "ONE_STEP";
      stage = "PHASE_1";

      profitTarget = rules.profitTarget;
      dailyDrawdown = rules.dailyDrawdown;
      maxDrawdown = rules.maxDrawdown;
      minimumTradeDays =
        rules.minimumTradingDays;
    } else if (
      payment.challengeType ===
      "Instant Funding"
    ) {
      const rules =
        TRADING_RULES.INSTANT.FUNDED;

      accountType = "INSTANT";
      stage = "FUNDED";

      profitTarget = 0;
      dailyDrawdown = rules.dailyDrawdown;
      maxDrawdown = rules.maxDrawdown;
      minimumTradeDays =
        rules.minimumTradingDays;
    } else {
      return NextResponse.json(
        { error: "Invalid challenge type." },
        { status: 400 }
      );
    }

    /*
     * CREATE CHALLENGE + COMPLETE PAYMENT
     */
    const challenge =
      await prisma.$transaction(
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

              nowPaymentsPaymentId:
                String(payment_id),

              paymentMethod: "CRYPTO",

              challengeId:
                createdChallenge.id,
            },
          });

          /*
           * COUNT PROMO USE
           */
          if (payment.promoCode) {
            const promo =
              await tx.promoCode.findFirst({
                where: {
                  code:
                    payment.promoCode,
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
      challengeId: challenge.id,
    });
  } catch (error: any) {
    console.error(
      "NOWPayments webhook error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Webhook processing failed.",
      },
      { status: 500 }
    );
  }
}