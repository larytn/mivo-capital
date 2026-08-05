import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    // AUTHENTICATION
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = verifyToken(token) as {
      id: string;
      email: string;
    } | null;

    if (!payload) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    // NOWPAYMENTS API KEY
    const apiKey = process.env.NOWPAYMENTS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "NOWPayments API key is not configured.",
        },
        { status: 500 }
      );
    }

    // REQUEST DATA
    const {
      accountSize,
      challengeType,
      amount,
      promoCode,
    } = await request.json();

    if (
      accountSize === undefined ||
      accountSize === null
    ) {
      return NextResponse.json(
        { error: "Account size is required." },
        { status: 400 }
      );
    }

    if (!challengeType) {
      return NextResponse.json(
        { error: "Challenge type is required." },
        { status: 400 }
      );
    }

    /*
     * Convert values to the types required
     * by the Payment Prisma model.
     */
    const normalizedAccountSize =
      String(accountSize);

    const normalizedChallengeType =
      String(challengeType);

    let finalAmount = Number(amount);

    if (
      !Number.isFinite(finalAmount) ||
      finalAmount <= 0
    ) {
      return NextResponse.json(
        { error: "Invalid payment amount." },
        { status: 400 }
      );
    }

    // VALIDATE PROMO
    let normalizedPromo: string | null = null;

    if (promoCode) {
      normalizedPromo = String(promoCode)
        .trim()
        .toUpperCase();

      const promo =
        await prisma.promoCode.findUnique({
          where: {
            code: normalizedPromo,
          },
        });

      if (!promo) {
        return NextResponse.json(
          { error: "Invalid promo code." },
          { status: 400 }
        );
      }

      if (!promo.active) {
        return NextResponse.json(
          { error: "Promo code is inactive." },
          { status: 400 }
        );
      }

      if (
        promo.expiresAt &&
        promo.expiresAt < new Date()
      ) {
        return NextResponse.json(
          { error: "Promo code has expired." },
          { status: 400 }
        );
      }

      if (
        promo.maxUses !== null &&
        promo.usedCount >= promo.maxUses
      ) {
        return NextResponse.json(
          {
            error: "Promo code usage limit reached.",
          },
          { status: 400 }
        );
      }
    }

    // ROUND PAYMENT AMOUNT
    finalAmount =
      Math.round(finalAmount * 100) / 100;

    // UNIQUE PAYMENT REFERENCE
    const txRef =
      `MIVO-CRYPTO-${Date.now()}-${Math.floor(
        Math.random() * 100000
      )}`;

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    // CREATE NOWPAYMENTS INVOICE
    const nowResponse = await fetch(
      "https://api.nowpayments.io/v1/invoice",
      {
        method: "POST",

        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          price_amount: finalAmount,
          price_currency: "usd",

          order_id: txRef,

          order_description:
            `${normalizedAccountSize} ${normalizedChallengeType}`,

         success_url: `${appUrl}/payment/success?provider=nowpayments&tx_ref=${encodeURIComponent(
  txRef
)}`,

          cancel_url:
            `${appUrl}/challenges`,

          ipn_callback_url:
            `${appUrl}/api/nowpayments/webhook`,
        }),
      }
    );

    const nowData = await nowResponse.json();

    console.log(
      "NOWPayments invoice response:",
      nowData
    );

    if (
      !nowResponse.ok ||
      !nowData.invoice_url
    ) {
      return NextResponse.json(
        {
          error:
            nowData.message ||
            "Unable to create crypto payment.",
        },
        {
          status: nowResponse.status || 500,
        }
      );
    }

    // SAVE PENDING PAYMENT
    const payment = await prisma.payment.create({
      data: {
        txRef,

        amount: finalAmount,

        currency: "USD",

        accountSize:
          normalizedAccountSize,

        challengeType:
          normalizedChallengeType,

        userId: payload.id,

        status: "PENDING",

        paymentMethod: "CRYPTO",

        promoCode: normalizedPromo,
      },
    });

    return NextResponse.json({
      status: "success",

      link: nowData.invoice_url,

      txRef,

      amount: finalAmount,

      paymentId: payment.id,
    });
  } catch (error: any) {
    console.error(
      "NOWPayments initialization error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Unable to initialize crypto payment.",
      },
      { status: 500 }
    );
  }
}