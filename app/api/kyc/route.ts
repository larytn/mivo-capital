import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

function getUserId(request: NextRequest) {
  const token = request.cookies.get("token")?.value;

  if (!token) return null;

  const payload = verifyToken(token) as { id: string } | null;

  return payload?.id ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const kyc = await prisma.kYC.findUnique({
      where: {
        userId,
      },
    });

    return NextResponse.json({
      kyc,
    });
  } catch (error: any) {
    console.error("KYC GET error:", error);

    return NextResponse.json(
      { error: error.message || "Failed to load KYC." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const {
      fullName,
      dateOfBirth,
      nationality,
      idType,
      idNumber,
      idFrontUrl,
      idBackUrl,
      selfieUrl,
      proofOfAddress,
    } = await request.json();

    if (
      !fullName ||
      !dateOfBirth ||
      !nationality ||
      !idType ||
      !idNumber ||
      !idFrontUrl ||
      !selfieUrl
    ) {
      return NextResponse.json(
        { error: "Please complete all required KYC fields." },
        { status: 400 }
      );
    }

    const existing = await prisma.kYC.findUnique({
      where: {
        userId,
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: "KYC has already been submitted.",
          status: existing.status,
        },
        { status: 400 }
      );
    }

    const parsedDateOfBirth = new Date(dateOfBirth);

    if (Number.isNaN(parsedDateOfBirth.getTime())) {
      return NextResponse.json(
        { error: "Invalid date of birth." },
        { status: 400 }
      );
    }

    const kyc = await prisma.kYC.create({
      data: {
        userId,
        fullName,
        dateOfBirth: parsedDateOfBirth,
        nationality,
        idType,
        idNumber,
        idFrontUrl,
        idBackUrl: idBackUrl || null,
        selfieUrl,
        proofOfAddress: proofOfAddress || null,
        status: "PENDING",
      },
    });

    return NextResponse.json(
      {
        message: "KYC submitted successfully.",
        kyc,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("KYC POST error:", error);

    return NextResponse.json(
      { error: error.message || "Failed to submit KYC." },
      { status: 500 }
    );
  }
}