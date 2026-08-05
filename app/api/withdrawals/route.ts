import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

function getUserId(request: NextRequest) {
  const token =
    request.cookies.get("token")?.value;

  if (!token) {
    return null;
  }

  const payload = verifyToken(token) as {
    id: string;
  } | null;

  return payload?.id ?? null;
}

/*
 * GET TRADER WITHDRAWALS
 */

export async function GET(
  request: NextRequest
) {
  try {
    const userId =
      getUserId(request);

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const withdrawals =
      await prisma.withdrawal.findMany({
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
    console.error(
      "Withdrawal GET error:",
      error
    );

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

/*
 * CREATE WITHDRAWAL REQUEST
 */

export async function POST(
  request: NextRequest
) {
  try {
    const userId =
      getUserId(request);

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
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

    /*
     * BASIC VALIDATION
     */

    if (!challengeId) {
      return NextResponse.json(
        {
          error:
            "Please select a trading account.",
        },
        { status: 400 }
      );
    }

    const withdrawalAmount =
      Number(amount);

    if (
      !Number.isFinite(
        withdrawalAmount
      ) ||
      withdrawalAmount <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Enter a valid withdrawal amount.",
        },
        { status: 400 }
      );
    }

    /*
     * FIND TRADING ACCOUNT
     *
     * userId is included so a trader
     * cannot withdraw from another
     * trader's account.
     */

    const challenge =
      await prisma.challenge.findFirst({
        where: {
          id: challengeId,
          userId,
        },
      });

    if (!challenge) {
      return NextResponse.json(
        {
          error:
            "Trading account not found.",
        },
        { status: 404 }
      );
    }

    /*
     * WITHDRAWAL ELIGIBILITY
     *
     * FUNDED is now a STAGE.
     *
     * The account must be:
     *
     * stage  = FUNDED
     * status = ACTIVE
     *
     * This works for:
     * ONE_STEP
     * TWO_STEP
     * INSTANT
     */

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

    /*
     * WITHDRAWABLE PROFIT
     */

    if (
      challenge.withdrawableProfit <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "This account currently has no withdrawable profit.",
        },
        { status: 400 }
      );
    }

    /*
     * RESERVED WITHDRAWALS
     *
     * Pending and approved withdrawals
     * are reserved so the trader cannot
     * submit multiple requests against
     * the same available profit.
     *
     * PAID is not included because paid
     * withdrawals should already have
     * been deducted from
     * withdrawableProfit.
     */

    const existingWithdrawals =
      await prisma.withdrawal.aggregate({
        where: {
          challengeId,

          status: {
            in: [
              "PENDING",
              "APPROVED",
            ],
          },
        },

        _sum: {
          amount: true,
        },
      });

    const alreadyRequested =
      existingWithdrawals._sum.amount ??
      0;

    const availableToWithdraw =
      Math.max(
        0,
        challenge.withdrawableProfit -
          alreadyRequested
      );

    if (
      withdrawalAmount >
      availableToWithdraw
    ) {
      return NextResponse.json(
        {
          error:
            `You can only withdraw up to $${availableToWithdraw.toLocaleString(
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

    /*
     * PAYOUT METHOD
     */

    if (
      !["BANK", "CRYPTO"].includes(
        method
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Select a valid withdrawal method.",
        },
        { status: 400 }
      );
    }

    /*
     * BANK VALIDATION
     */

    if (method === "BANK") {
      if (
        !accountName ||
        !accountNumber ||
        !bankName
      ) {
        return NextResponse.json(
          {
            error:
              "Complete your bank details.",
          },
          { status: 400 }
        );
      }
    }

    /*
     * CRYPTO VALIDATION
     */

    if (method === "CRYPTO") {
      if (
        !cryptoNetwork ||
        !walletAddress
      ) {
        return NextResponse.json(
          {
            error:
              "Complete your crypto payout details.",
          },
          { status: 400 }
        );
      }
    }

    /*
     * CREATE WITHDRAWAL
     */

    const withdrawal =
      await prisma.withdrawal.create({
        data: {
          userId,
          challengeId,

          amount:
            withdrawalAmount,

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

        message:
          "Withdrawal request submitted.",

        withdrawal,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error(
      "Withdrawal POST error:",
      error
    );

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