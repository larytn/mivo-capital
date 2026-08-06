import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

type TokenPayload = {
  id?: string;
  userId?: string;
};

export async function GET(request: NextRequest) {
  try {
    const token =
      request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const payload = verifyToken(
      token
    ) as TokenPayload | null;

    if (!payload) {
      return NextResponse.json(
        {
          error: "Invalid token",
        },
        {
          status: 401,
        }
      );
    }

    // Support both normal email-login tokens
    // and Google-login tokens.
    const userId =
      payload.id || payload.userId;

    if (!userId) {
      return NextResponse.json(
        {
          error: "Invalid token",
        },
        {
          status: 401,
        }
      );
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },

        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          referralCode: true,
          authProvider: true,

          kyc: {
            select: {
              status: true,
            },
          },
        },
      });

    if (!user) {
      return NextResponse.json(
        {
          error: "User not found",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        referralCode:
          user.referralCode,

        authProvider:
          user.authProvider,

        kycStatus:
          user.kyc?.status ?? null,
      },
    });
  } catch (error) {
    console.error(
      "PROFILE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to load profile.",
      },
      {
        status: 500,
      }
    );
  }
}