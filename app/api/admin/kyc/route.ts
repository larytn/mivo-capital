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

// GET ALL KYC SUBMISSIONS
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

    const kycs = await prisma.kYC.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      kycs,
    });
  } catch (error: any) {
    console.error(
      "Admin KYC GET error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Failed to load KYC submissions.",
      },
      { status: 500 }
    );
  }
}

// APPROVE OR REJECT KYC
export async function PATCH(
  request: NextRequest
) {
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

    const {
      kycId,
      status,
      adminNote,
    } = await request.json();

    if (!kycId) {
      return NextResponse.json(
        { error: "KYC ID is required." },
        { status: 400 }
      );
    }

    if (
      !["APPROVED", "REJECTED"].includes(
        status
      )
    ) {
      return NextResponse.json(
        { error: "Invalid KYC status." },
        { status: 400 }
      );
    }

    const existingKYC =
      await prisma.kYC.findUnique({
        where: {
          id: kycId,
        },
      });

    if (!existingKYC) {
      return NextResponse.json(
        {
          error:
            "KYC submission not found.",
        },
        { status: 404 }
      );
    }

    const kyc = await prisma.kYC.update({
      where: {
        id: kycId,
      },

      data: {
        status,

        adminNote:
          status === "REJECTED"
            ? adminNote ||
              "Verification rejected."
            : null,
      },
    });

    return NextResponse.json({
      success: true,

      message:
        status === "APPROVED"
          ? "KYC approved successfully."
          : "KYC rejected.",

      kyc,
    });
  } catch (error: any) {
    console.error(
      "Admin KYC PATCH error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Failed to update KYC.",
      },
      { status: 500 }
    );
  }
}