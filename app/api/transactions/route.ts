import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
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
    } | null;

    if (!payload) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    const transactions = await prisma.payment.findMany({
      where: {
        userId: payload.id,
      },
      select: {
        id: true,
        txRef: true,
        amount: true,
        currency: true,
        status: true,
        accountSize: true,
        challengeType: true,
        paymentMethod: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      transactions,
    });
  } catch (error) {
    console.error("TRANSACTIONS ERROR:", error);

    return NextResponse.json(
      { error: "Failed to load transactions." },
      { status: 500 }
    );
  }
}