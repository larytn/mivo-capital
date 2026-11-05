import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/api-auth";

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

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    let user = await prisma.user.findUnique({
      where: {
        id: userId,
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
          id: userId,
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
