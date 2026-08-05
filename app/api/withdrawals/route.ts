import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

function getUserId(request: NextRequest) {
  const token = request.cookies.get("token")?.value;

  if (!token) return null;

  const payload = verifyToken(token) as {
    id: string;
  } | null;

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

    const withdrawals = await prisma.withdrawal.findMany({
      where: {
        userId,
      },

      include: {
        challenge: {
          select: {
            id: true,
            account: true,
            mt5Login: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      withdrawals,
    });
  } catch (error: any) {
    console.error("Withdrawal GET error:", error);

    return NextResponse.json(
      {
        error:
          error.message ||
          "Failed to load withdrawals.",
      },
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

    // KYC CHECK
    const kyc = await prisma.kYC.findUnique({
      where: {
        userId,
      },
      select: {
        status: true,
      },
    });

    if (!kyc || kyc.status !== "APPROVED") {
      return NextResponse.json(
        {
          error:
            "KYC verification must be approved before you can request a withdrawal.",
        },
        { status: 403 }
      );
    }

    const {
      challengeId,
      amount,
      method,
      accountName,
      accountNumber,
      bankName,
      cryptoNetwork,
      walletAddress,
    } = await request.json();

    if (!challengeId) {
      return NextResponse.json(
        {
          error: "Please select a trading account.",
        },
        { status: 400 }
      );
    }

    const withdrawalAmount = Number(amount);

    if (
      !Number.isFinite(withdrawalAmount) ||
      withdrawalAmount <= 0
    ) {
      return NextResponse.json(
        {
          error: "Enter a valid withdrawal amount.",
        },
        { status: 400 }
      );
    }

    const challenge = await prisma.challenge.findFirst({
      where: {
        id: challengeId,
        userId,
      },
    });

    if (!challenge) {
      return NextResponse.json(
        {
          error: "Trading account not found.",
        },
        { status: 404 }
      );
    }

    // MUST BE ACTIVE + FUNDED
    if (
      challenge.stage !== "FUNDED" ||
      challenge.status !== "ACTIVE"
    ) {
      return NextResponse.json(
        {
          error:
            "Withdrawals are only available from active funded accounts.",
        },
        { status: 400 }
      );
    }

    if (challenge.withdrawableProfit <= 0) {
      return NextResponse.json(
        {
          error:
            "This account currently has no withdrawable profit.",
        },
        { status: 400 }
      );
    }

    // CHECK ALREADY RESERVED WITHDRAWALS
    const existingWithdrawals =
      await prisma.withdrawal.aggregate({
        where: {
          challengeId,

          status: {
            in: ["PENDING", "APPROVED"],
          },
        },

        _sum: {
          amount: true,
        },
      });

    const alreadyRequested =
      existingWithdrawals._sum.amount ?? 0;

    const availableToWithdraw = Math.max(
      0,
      challenge.withdrawableProfit -
        alreadyRequested
    );

    if (withdrawalAmount > availableToWithdraw) {
      return NextResponse.json(
        {
          error: `You can only withdraw up to $${availableToWithdraw.toLocaleString(
            "en-US",
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }
          )}.`,
        },
        { status: 400 }
      );
    }

    // PAYOUT METHOD
    if (!["BANK", "CRYPTO"].includes(method)) {
      return NextResponse.json(
        {
          error: "Select a valid withdrawal method.",
        },
        { status: 400 }
      );
    }

    // BANK
    if (method === "BANK") {
      if (
        !accountName ||
        !accountNumber ||
        !bankName
      ) {
        return NextResponse.json(
          {
            error: "Complete your bank details.",
          },
          { status: 400 }
        );
      }
    }

    // CRYPTO
    if (method === "CRYPTO") {
      if (!cryptoNetwork || !walletAddress) {
        return NextResponse.json(
          {
            error:
              "Complete your crypto payout details.",
          },
          { status: 400 }
        );
      }
    }

    const withdrawal =
      await prisma.withdrawal.create({
        data: {
          userId,
          challengeId,

          amount: withdrawalAmount,

          method,

          accountName:
            method === "BANK"
              ? accountName
              : null,

          accountNumber:
            method === "BANK"
              ? accountNumber
              : null,

          bankName:
            method === "BANK"
              ? bankName
              : null,

          cryptoNetwork:
            method === "CRYPTO"
              ? cryptoNetwork
              : null,

          walletAddress:
            method === "CRYPTO"
              ? walletAddress
              : null,

          status: "PENDING",
        },

        include: {
          challenge: {
            select: {
              id: true,
              account: true,
              mt5Login: true,
            },
          },
        },
      });

    return NextResponse.json(
      {
        success: true,
        message: "Withdrawal request submitted.",
        withdrawal,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Withdrawal POST error:", error);

    return NextResponse.json(
      {
        error:
          error.message ||
          "Failed to submit withdrawal.",
      },
      { status: 500 }
    );
  }
}