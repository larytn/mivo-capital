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
    /*
     * NOWPAYMENTS CONFIG
     */
    const ipnSecret =
      process.env.NOWPAYMENTS_IPN_SECRET;

    const apiKey =
      process.env.NOWPAYMENTS_API_KEY;

    if (!ipnSecret || !apiKey) {
      return NextResponse.json(
        {
          error:
            "NOWPayments is not configured.",
        },
        { status: 500 }
      );
    }

    /*
     * GET SIGNATURE
     */
    const signature =
      request.headers.get(
        "x-nowpayments-sig"
      );

    if (!signature) {
      return NextResponse.json(
        {
          error: "Missing signature.",
        },
        { status: 401 }
      );
    }

    /*
     * GET WEBHOOK BODY
     */
    const body =
      await request.json();

    /*
     * VERIFY IPN SIGNATURE
     */
    const expectedSignature =
      createHmac(
        "sha512",
        ipnSecret
      )
        .update(
          JSON.stringify(
            sortObject(body)
          )
        )
        .digest("hex");

    let receivedBuffer: Buffer;
    let expectedBuffer: Buffer;

    try {
      receivedBuffer =
        Buffer.from(
          signature,
          "hex"
        );

      expectedBuffer =
        Buffer.from(
          expectedSignature,
          "hex"
        );
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid signature.",
        },
        { status: 401 }
      );
    }

    if (
      receivedBuffer.length !==
        expectedBuffer.length ||
      !timingSafeEqual(
        receivedBuffer,
        expectedBuffer
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid signature.",
        },
        { status: 401 }
      );
    }

    /*
     * PAYMENT DATA
     */
    const {
      payment_id,
      payment_status,
      order_id,
    } = body;

    if (
      !payment_id ||
      !order_id
    ) {
      return NextResponse.json(
        {
          error:
            "Missing payment information.",
        },
        { status: 400 }
      );
    }

    /*
     * ONLY PROCESS FINISHED PAYMENTS
     */
    if (
      payment_status !==
      "finished"
    ) {
      return NextResponse.json({
        status: "ignored",
        paymentStatus:
          payment_status,
      });
    }

    /*
     * VERIFY PAYMENT DIRECTLY
     * WITH NOWPAYMENTS
     */
    const verifyResponse =
      await fetch(
        `https://api.nowpayments.io/v1/payment/${payment_id}`,
        {
          headers: {
            "x-api-key":
              apiKey,
          },
          cache: "no-store",
        }
      );

    const verifyData =
      await verifyResponse.json();

    if (
      !verifyResponse.ok ||
      verifyData.payment_status !==
        "finished"
    ) {
      console.error(
        "NOWPayments verification failed:",
        verifyData
      );

      return NextResponse.json(
        {
          error:
            "Payment verification failed.",
        },
        { status: 400 }
      );
    }

    /*
     * CONFIRM ORDER REFERENCE
     */
    if (
      String(
        verifyData.order_id
      ) !==
      String(order_id)
    ) {
      return NextResponse.json(
        {
          error:
            "Order reference mismatch.",
        },
        { status: 400 }
      );
    }

    /*
     * FIND MIVO PAYMENT
     */
    const payment =
      await prisma.payment.findUnique({
        where: {
          txRef:
            String(order_id),
        },
      });

    if (!payment) {
      return NextResponse.json(
        {
          error:
            "Payment not found.",
        },
        { status: 404 }
      );
    }

    /*
     * PREVENT DUPLICATE
     * CHALLENGE CREATION
     */
    if (
      payment.status ===
      "SUCCESS"
    ) {
      return NextResponse.json({
        status: "success",
        challengeId:
          payment.challengeId,
      });
    }

    /*
     * NORMALIZE CHALLENGE TYPE
     *
     * Supports both the new values:
     *
     * THREE_STEP
     * TWO_STEP
     * ONE_STEP
     * INSTANT
     *
     * and older payment records:
     *
     * Three-Step Challenge
     * Two-Step Challenge
     * One-Step Challenge
     * Instant Funding
     */
    let normalizedType:
      | "THREE_STEP"
      | "TWO_STEP"
      | "ONE_STEP"
      | "INSTANT";

    if (
      payment.challengeType ===
        "THREE_STEP" ||
      payment.challengeType ===
        "Three-Step Challenge"
    ) {
      normalizedType =
        "THREE_STEP";
    } else if (
      payment.challengeType ===
        "TWO_STEP" ||
      payment.challengeType ===
        "Two-Step Challenge"
    ) {
      normalizedType =
        "TWO_STEP";
    } else if (
      payment.challengeType ===
        "ONE_STEP" ||
      payment.challengeType ===
        "One-Step Challenge"
    ) {
      normalizedType =
        "ONE_STEP";
    } else if (
      payment.challengeType ===
        "INSTANT" ||
      payment.challengeType ===
        "Instant Funding"
    ) {
      normalizedType =
        "INSTANT";
    } else {
      return NextResponse.json(
        {
          error:
            `Invalid challenge type: ${payment.challengeType}`,
        },
        { status: 400 }
      );
    }

    /*
     * PRODUCT RULES
     */
    let stage:
      | "PHASE_1"
      | "FUNDED";

    let profitTarget: number;
    let dailyDrawdown: number;
    let maxDrawdown: number;
    let minimumTradeDays: number;

    if (
      normalizedType ===
      "THREE_STEP"
    ) {
      const rules =
        TRADING_RULES
          .THREE_STEP
          .PHASE_1;

      stage = "PHASE_1";

      profitTarget =
        rules.profitTarget;

      dailyDrawdown =
        rules.dailyDrawdown;

      maxDrawdown =
        rules.maxDrawdown;

      minimumTradeDays =
        rules.minimumTradingDays;
    } else if (
      normalizedType ===
      "TWO_STEP"
    ) {
      const rules =
        TRADING_RULES
          .TWO_STEP
          .PHASE_1;

      stage = "PHASE_1";

      profitTarget =
        rules.profitTarget;

      dailyDrawdown =
        rules.dailyDrawdown;

      maxDrawdown =
        rules.maxDrawdown;

      minimumTradeDays =
        rules.minimumTradingDays;
    } else if (
      normalizedType ===
      "ONE_STEP"
    ) {
      const rules =
        TRADING_RULES
          .ONE_STEP
          .PHASE_1;

      stage = "PHASE_1";

      profitTarget =
        rules.profitTarget;

      dailyDrawdown =
        rules.dailyDrawdown;

      maxDrawdown =
        rules.maxDrawdown;

      minimumTradeDays =
        rules.minimumTradingDays;
    } else {
      const rules =
        TRADING_RULES
          .INSTANT
          .FUNDED;

      stage = "FUNDED";

      profitTarget = 0;

      dailyDrawdown =
        rules.dailyDrawdown;

      maxDrawdown =
        rules.maxDrawdown;

      minimumTradeDays =
        rules.minimumTradingDays;
    }

    /*
     * CREATE CHALLENGE +
     * COMPLETE PAYMENT
     */
    const challenge =
      await prisma.$transaction(
        async (tx) => {
          /*
           * Re-check payment inside
           * transaction.
           */
          const currentPayment =
            await tx.payment.findUnique({
              where: {
                id: payment.id,
              },
            });

          if (!currentPayment) {
            throw new Error(
              "Payment disappeared during processing."
            );
          }

          /*
           * Another webhook may have
           * already processed it.
           */
          if (
            currentPayment.status ===
              "SUCCESS" &&
            currentPayment.challengeId
          ) {
            const existingChallenge =
              await tx.challenge.findUnique({
                where: {
                  id:
                    currentPayment.challengeId,
                },
              });

            if (!existingChallenge) {
              throw new Error(
                "Completed payment challenge could not be found."
              );
            }

            return existingChallenge;
          }

          /*
           * CREATE TRADING CHALLENGE
           */
          const createdChallenge =
            await tx.challenge.create({
              data: {
                account:
                  payment.accountSize,

                price:
                  payment.amount,

                type:
                  normalizedType,

                accountType:
                  normalizedType,

                stage,

                status:
                  "PENDING",

                profitTarget,

                dailyDrawdown,

                maxDrawdown,

                minimumTradeDays,

                userId:
                  payment.userId,
              },
            });

          /*
           * COMPLETE PAYMENT
           */
          await tx.payment.update({
            where: {
              id:
                payment.id,
            },

            data: {
              status:
                "SUCCESS",

              nowPaymentsPaymentId:
                String(
                  payment_id
                ),

              paymentMethod:
                "CRYPTO",

              challengeId:
                createdChallenge.id,
            },
          });

          /*
           * COUNT PROMO USE
           */
          if (
            payment.promoCode
          ) {
            const normalizedPromo =
              payment.promoCode
                .trim()
                .toUpperCase();

            const promo =
              await tx.promoCode.findUnique({
                where: {
                  code:
                    normalizedPromo,
                },
              });

            if (promo) {
              await tx.promoCode.update({
                where: {
                  id:
                    promo.id,
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

    console.log(
      "NOWPayments payment completed:",
      {
        paymentId:
          payment.id,
        txRef:
          payment.txRef,
        challengeId:
          challenge.id,
        accountType:
          normalizedType,
      }
    );

    return NextResponse.json({
      status: "success",

      paymentId:
        payment.id,

      challengeId:
        challenge.id,
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