import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

async function generateUniqueReferralCode() {
  while (true) {
    const code = `MIVO${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;

    const existing = await prisma.user.findUnique({
      where: {
        referralCode: code,
      },
    });

    if (!existing) {
      return code;
    }
  }
}

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

    let user = await prisma.user.findUnique({
      where: {
        id: payload.id,
      },
      select: {
        id: true,
        referralCode: true,
        referrals: {
          select: {
            id: true,
            name: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Existing users may not have a referral code yet.
    if (!user.referralCode) {
      const referralCode =
        await generateUniqueReferralCode();

      user = await prisma.user.update({
        where: {
          id: payload.id,
        },
        data: {
          referralCode,
        },
        select: {
          id: true,
          referralCode: true,
          referrals: {
            select: {
              id: true,
              name: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });
    }

    return NextResponse.json({
      referralCode: user.referralCode,
      totalReferrals: user.referrals.length,
      referrals: user.referrals,
    });
  } catch (error) {
    console.error("REFERRALS ERROR:", error);

    return NextResponse.json(
      { error: "Failed to load referrals." },
      { status: 500 }
    );
  }
}