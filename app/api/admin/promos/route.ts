import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

function isAdmin(request: NextRequest) {
  const token = request.cookies.get("token")?.value;

  if (!token) return false;

  const payload = verifyToken(token) as {
    id: string;
    role: string;
  } | null;

  return payload?.role === "ADMIN";
}

// GET ALL PROMO CODES
export async function GET(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      );
    }

    const promos = await prisma.promoCode.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      promos,
    });
  } catch (error: any) {
    console.error("PROMO GET ERROR:", error);

    return NextResponse.json(
      {
        error: error.message || "Failed to load promo codes.",
      },
      { status: 500 }
    );
  }
}

// CREATE PROMO CODE
export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      );
    }

    const {
      code,
      discountPercent,
      maxUses,
      expiresAt,
    } = await request.json();

    const discount = Number(discountPercent);

    if (!code?.trim()) {
      return NextResponse.json(
        { error: "Promo code is required." },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(discount) ||
      discount <= 0 ||
      discount > 100
    ) {
      return NextResponse.json(
        {
          error: "Discount must be between 1 and 100.",
        },
        { status: 400 }
      );
    }

    const normalizedCode = code.trim().toUpperCase();

    const existing = await prisma.promoCode.findUnique({
      where: {
        code: normalizedCode,
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: "Promo code already exists.",
        },
        { status: 400 }
      );
    }

    const promo = await prisma.promoCode.create({
      data: {
        code: normalizedCode,
        discountPercent: discount,

        maxUses:
          maxUses !== null &&
          maxUses !== undefined &&
          maxUses !== ""
            ? Number(maxUses)
            : null,

        expiresAt: expiresAt
          ? new Date(expiresAt)
          : null,

        active: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Promo code created.",
        promo,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("PROMO POST ERROR:", error);

    return NextResponse.json(
      {
        error: error.message || "Failed to create promo code.",
      },
      { status: 500 }
    );
  }
}

// ACTIVATE / DEACTIVATE PROMO
export async function PATCH(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      );
    }

    const { promoId, active } = await request.json();

    if (!promoId) {
      return NextResponse.json(
        {
          error: "Promo ID is required.",
        },
        { status: 400 }
      );
    }

    if (typeof active !== "boolean") {
      return NextResponse.json(
        {
          error: "Invalid promo status.",
        },
        { status: 400 }
      );
    }

    const promo = await prisma.promoCode.update({
      where: {
        id: promoId,
      },

      data: {
        active,
      },
    });

    return NextResponse.json({
      success: true,
      message: active
        ? "Promo code activated."
        : "Promo code deactivated.",
      promo,
    });
  } catch (error: any) {
    console.error("PROMO PATCH ERROR:", error);

    return NextResponse.json(
      {
        error: error.message || "Failed to update promo code.",
      },
      { status: 500 }
    );
  }
}