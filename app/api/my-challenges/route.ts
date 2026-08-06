import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

type TokenPayload = {
  id?: string;
  userId?: string;
};

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = verifyToken(token) as TokenPayload | null;

    if (!payload) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    // Email login may use "id"
    // Google login may use "userId"
    const userId = payload.id || payload.userId;

    if (!userId) {
      return NextResponse.json(
        { error: "Invalid user session" },
        { status: 401 }
      );
    }

    // IMPORTANT:
    // Only return trading accounts belonging
    // to the currently logged-in trader.
    const challenges = await prisma.challenge.findMany({
      where: {
        userId,
      },

      select: {
        id: true,
        account: true,
        price: true,
        type: true,

        accountType: true,
        stage: true,
        status: true,

        startingBalance: true,
        currentBalance: true,
        currentEquity: true,
        profit: true,
        withdrawableProfit: true,

        platform: true,
        broker: true,
        server: true,
        mt5Login: true,

        createdAt: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(challenges);
  } catch (error) {
    console.error("My challenges error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load trading accounts.",
      },
      { status: 500 }
    );
  }
}