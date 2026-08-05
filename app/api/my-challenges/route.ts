import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

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

    const challenges = await prisma.challenge.findMany({
      where: {
        userId: payload.id,
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
  } catch (error: any) {
    console.error("My challenges error:", error);

    return NextResponse.json(
      {
        error:
          error.message ||
          "Failed to load trading accounts.",
      },
      { status: 500 }
    );
  }
}