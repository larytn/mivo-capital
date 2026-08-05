import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

function getAdmin(request: NextRequest) {
  const token = request.cookies.get("token")?.value;

  if (!token) return null;

  const payload = verifyToken(token) as {
    id: string;
    email: string;
    role: string;
  } | null;

  if (!payload || payload.role !== "ADMIN") {
    return null;
  }

  return payload;
}

// GET ALL WITHDRAWALS
export async function GET(request: NextRequest) {
  try {
    const admin = getAdmin(request);

    if (!admin) {
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      );
    }

    const withdrawals = await prisma.withdrawal.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        challenge: {
          select: {
            id: true,
            account: true,
            mt5Login: true,
            currentBalance: true,
            profit: true,
            withdrawableProfit: true,
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
      "Admin withdrawals GET error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Failed to load withdrawal requests.",
      },
      { status: 500 }
    );
  }
}

// APPROVE / REJECT / PAY WITHDRAWAL
export async function PATCH(request: NextRequest) {
  try {
    const admin = getAdmin(request);

    if (!admin) {
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      );
    }

    const {
      withdrawalId,
      status,
      adminNote,
    } = await request.json();

    if (!withdrawalId) {
      return NextResponse.json(
        {
          error: "Withdrawal ID is required.",
        },
        { status: 400 }
      );
    }

    const allowedStatuses = [
      "APPROVED",
      "REJECTED",
      "PAID",
    ];

    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        {
          error: "Invalid withdrawal status.",
        },
        { status: 400 }
      );
    }

    const existing =
      await prisma.withdrawal.findUnique({
        where: {
          id: withdrawalId,
        },

        include: {
          challenge: true,
        },
      });

    if (!existing) {
      return NextResponse.json(
        {
          error: "Withdrawal request not found.",
        },
        { status: 404 }
      );
    }

    // FINAL STATES CANNOT BE CHANGED

    if (existing.status === "PAID") {
      return NextResponse.json(
        {
          error:
            "This withdrawal has already been paid.",
        },
        { status: 400 }
      );
    }

    if (existing.status === "REJECTED") {
      return NextResponse.json(
        {
          error:
            "This withdrawal has already been rejected.",
        },
        { status: 400 }
      );
    }

    // APPROVE

    if (status === "APPROVED") {
      if (existing.status !== "PENDING") {
        return NextResponse.json(
          {
            error:
              "Only pending withdrawals can be approved.",
          },
          { status: 400 }
        );
      }

      const withdrawal =
        await prisma.withdrawal.update({
          where: {
            id: withdrawalId,
          },

          data: {
            status: "APPROVED",
            adminNote: adminNote || null,
          },
        });

      return NextResponse.json({
        success: true,
        message: "Withdrawal approved.",
        withdrawal,
      });
    }

    // REJECT

    if (status === "REJECTED") {
      if (existing.status !== "PENDING") {
        return NextResponse.json(
          {
            error:
              "Only pending withdrawals can be rejected.",
          },
          { status: 400 }
        );
      }

      const withdrawal =
        await prisma.withdrawal.update({
          where: {
            id: withdrawalId,
          },

          data: {
            status: "REJECTED",

            adminNote:
              adminNote?.trim() ||
              "Withdrawal rejected.",
          },
        });

      return NextResponse.json({
        success: true,
        message: "Withdrawal rejected.",
        withdrawal,
      });
    }

    // MARK AS PAID

    if (status === "PAID") {
      if (existing.status !== "APPROVED") {
        return NextResponse.json(
          {
            error:
              "Withdrawal must be approved before it can be marked as paid.",
          },
          { status: 400 }
        );
      }

      if (
        !existing.challengeId ||
        !existing.challenge
      ) {
        return NextResponse.json(
          {
            error:
              "Withdrawal is not connected to a trading account.",
          },
          { status: 400 }
        );
      }

      if (
        existing.challenge.withdrawableProfit <
        existing.amount
      ) {
        return NextResponse.json(
          {
            error:
              "Trading account does not have enough withdrawable profit.",
          },
          { status: 400 }
        );
      }

      const result = await prisma.$transaction(
        async (tx) => {
          // Re-check inside transaction

          const currentWithdrawal =
            await tx.withdrawal.findUnique({
              where: {
                id: withdrawalId,
              },
            });

          if (
            !currentWithdrawal ||
            currentWithdrawal.status !== "APPROVED"
          ) {
            throw new Error(
              "Withdrawal is no longer eligible for payment."
            );
          }

          const challenge =
            await tx.challenge.findUnique({
              where: {
                id: existing.challengeId!,
              },
            });

          if (!challenge) {
            throw new Error(
              "Trading account not found."
            );
          }

          if (
            challenge.withdrawableProfit <
            existing.amount
          ) {
            throw new Error(
              "Insufficient withdrawable profit."
            );
          }

          const withdrawal =
            await tx.withdrawal.update({
              where: {
                id: withdrawalId,
              },

              data: {
                status: "PAID",
                adminNote: adminNote || null,
              },
            });

          const updatedChallenge =
            await tx.challenge.update({
              where: {
                id: existing.challengeId!,
              },

              data: {
                currentBalance: {
                  decrement: existing.amount,
                },

                profit: {
                  decrement: existing.amount,
                },

                withdrawableProfit: {
                  decrement: existing.amount,
                },
              },
            });

          return {
            withdrawal,
            challenge: updatedChallenge,
          };
        }
      );

      return NextResponse.json({
        success: true,

        message:
          "Withdrawal marked as paid successfully.",

        withdrawal: result.withdrawal,
        challenge: result.challenge,
      });
    }

    return NextResponse.json(
      {
        error: "Invalid request.",
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error(
      "Admin withdrawal PATCH error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Failed to update withdrawal.",
      },
      { status: 500 }
    );
  }
}