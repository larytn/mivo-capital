import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Get all KYC submissions
export async function GET() {
  try {
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
    console.error("Admin KYC GET error:", error);

    return NextResponse.json(
      {
        error: error.message || "Failed to load KYC submissions.",
      },
      { status: 500 }
    );
  }
}

// Approve or reject KYC
export async function PATCH(request: NextRequest) {
  try {
    const { kycId, status, adminNote } = await request.json();

    if (!kycId) {
      return NextResponse.json(
        { error: "KYC ID is required." },
        { status: 400 }
      );
    }

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid KYC status." },
        { status: 400 }
      );
    }

    const existingKYC = await prisma.kYC.findUnique({
      where: {
        id: kycId,
      },
    });

    if (!existingKYC) {
      return NextResponse.json(
        { error: "KYC submission not found." },
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
            ? adminNote || "Verification rejected."
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
    console.error("Admin KYC PATCH error:", error);

    return NextResponse.json(
      {
        error: error.message || "Failed to update KYC.",
      },
      { status: 500 }
    );
  }
}