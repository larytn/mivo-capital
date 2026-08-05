import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
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

    const {
      accountSize,
      challengeType,
      amount,
      promoCode,
    } = await request.json();

    let finalAmount = Number(amount);

    if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid payment amount." },
        { status: 400 }
      );
    }

    // VALIDATE PROMO CODE AGAIN ON BACKEND
    if (promoCode) {
      const code = String(promoCode)
        .trim()
        .toUpperCase();

    const allPromos = await prisma.promoCode.findMany();

const promo = allPromos.find(
  (item) =>
    item.code.trim().toUpperCase() === code
);

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
          { error: "Promo code usage limit reached." },
          { status: 400 }
        );
      }

      
    }

    const txRef = `MIVO-${Date.now()}-${Math.floor(
      Math.random() * 100000
    )}`;

await prisma.payment.create({
  data: {
    txRef,
    amount: finalAmount,
    accountSize,
    challengeType,
    userId: payload.id,
    status: "PENDING",
    promoCode: promoCode
      ? String(promoCode).trim().toUpperCase()
      : null,
  },
});

    const redirectUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const flutterwaveResponse = await fetch(
      "https://api.flutterwave.com/v3/payments",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tx_ref: txRef,
          amount: finalAmount,
          currency: "USD",
          redirect_url: `${redirectUrl}/payment/success`,
          customer: {
            email: payload.email,
          },
          customizations: {
            title: "Mivo Capital",
            description: `${accountSize} ${challengeType}`,
            logo: "",
          },
        }),
      }
    );

    const data =
      await flutterwaveResponse.json();

    console.log("Flutterwave Response:");
    console.log(JSON.stringify(data, null, 2));

    if (
      !flutterwaveResponse.ok ||
      data.status !== "success"
    ) {
      return NextResponse.json(
        {
          error:
            data.message ||
            "Flutterwave initialization failed",
          flutterwave: data,
        },
        {
          status:
            flutterwaveResponse.status || 500,
        }
      );
    }

    return NextResponse.json({
      link: data.data.link,
      amount: finalAmount,
    });
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error.message ||
          "Unable to initialize payment.",
      },
      {
        status: 500,
      }
    );
  }
}