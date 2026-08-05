import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Get all withdrawal requests
export async function GET() {
  try {
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
    console.error("Admin withdrawals GET error:", error);

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

// Update withdrawal status
export async function PATCH(request: NextRequest) {
  try {
    const { withdrawalId, status, adminNote } =
      await request.json();

    if (!withdrawalId) {
      return NextResponse.json(
        { error: "Withdrawal ID is required." },
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
        { error: "Invalid withdrawal status." },
        { status: 400 }
      );
    }

    const existing = await prisma.withdrawal.findUnique({
      where: {
        id: withdrawalId,
      },

      include: {
        challenge: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Withdrawal request not found." },
        { status: 404 }
      );
    }

    // Prevent already-paid withdrawals from being paid twice
    if (existing.status === "PAID") {
      return NextResponse.json(
        {
          error: "This withdrawal has already been paid.",
        },
        { status: 400 }
      );
    }

    // Mark as PAID and deduct withdrawable profit
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

      if (!existing.challengeId || !existing.challenge) {
        return NextResponse.json(
          {
            error:
              "This withdrawal is not connected to a trading account.",
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
              "The account does not have enough withdrawable profit.",
          },
          { status: 400 }
        );
      }

      const result = await prisma.$transaction(
        async (tx) => {
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

          const challenge =
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
            challenge,
          };
        }
      );

      return NextResponse.json({
        success: true,
        message:
          "Withdrawal marked as paid and withdrawable profit updated.",
        withdrawal: result.withdrawal,
        challenge: result.challenge,
      });
    }

    // Normal APPROVE / REJECT
    const withdrawal =
      await prisma.withdrawal.update({
        where: {
          id: withdrawalId,
        },

        data: {
          status,

          adminNote:
            status === "REJECTED"
              ? adminNote || "Withdrawal rejected."
              : adminNote || null,
        },
      });

    return NextResponse.json({
      success: true,
      message: "Withdrawal updated successfully.",
      withdrawal,
    });
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