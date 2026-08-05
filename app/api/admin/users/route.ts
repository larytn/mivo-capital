import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

function getAdmin(request: NextRequest) {
  const token = request.cookies.get("token")?.value;

  if (!token) return null;

  return verifyToken(token) as {
    id: string;
    email: string;
    role: string;
  } | null;
}

export async function GET(request: NextRequest) {
  try {
    const admin = getAdmin(request);

    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (admin.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      );
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        referralCode: true,

        kyc: {
          select: {
            status: true,
          },
        },

        _count: {
          select: {
            challenges: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedUsers = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      referralCode: user.referralCode,
      kycStatus: user.kyc?.status ?? null,
      challenges: user._count.challenges,
    }));

    return NextResponse.json({
      users: formattedUsers,
    });
  } catch (error: any) {
    console.error("ADMIN USERS GET ERROR:", error);

    return NextResponse.json(
      {
        error:
          error.message ||
          "Failed to load users.",
      },
      { status: 500 }
    );
  }
}