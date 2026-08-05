import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const code = body.code?.trim().toUpperCase();

    if (!code) {
      return NextResponse.json(
        { error: "Enter a promo code." },
        { status: 400 }
      );
    }

    // Check what promo codes this API can actually see
    const allPromos = await prisma.promoCode.findMany();

    console.log("PROMOS IN DATABASE:", allPromos);
    console.log("CODE RECEIVED:", code);

    const promo = allPromos.find(
      (item) => item.code.trim().toUpperCase() === code
    );

    if (!promo) {
      return NextResponse.json(
        { error: "Invalid promo code." },
        { status: 404 }
      );
    }

    if (!promo.active) {
      return NextResponse.json(
        { error: "This promo code is inactive." },
        { status: 400 }
      );
    }

    if (promo.expiresAt && promo.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "This promo code has expired." },
        { status: 400 }
      );
    }

    if (
      promo.maxUses !== null &&
      promo.usedCount >= promo.maxUses
    ) {
      return NextResponse.json(
        { error: "This promo code has reached its usage limit." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      code: promo.code,
      discountPercent: promo.discountPercent,
    });
  } catch (error) {
    console.error("PROMO VALIDATION ERROR:", error);

    return NextResponse.json(
      { error: "Unable to validate promo code." },
      { status: 500 }
    );
  }
}