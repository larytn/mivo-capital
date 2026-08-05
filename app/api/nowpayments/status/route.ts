import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    /*
     * AUTHENTICATION
     */
    const token =
      request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = verifyToken(token) as {
      id: string;
      email?: string;
    } | null;

    if (!payload) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    /*
     * GET TRANSACTION REFERENCE
     */
    const txRef =
      request.nextUrl.searchParams.get(
        "tx_ref"
      );

    if (!txRef) {
      return NextResponse.json(
        {
          error:
            "Transaction reference is required.",
        },
        { status: 400 }
      );
    }

    /*
     * FIND PAYMENT
     *
     * userId prevents one trader from
     * checking another trader's payment.
     */
    const payment =
      await prisma.payment.findFirst({
        where: {
          txRef,
          userId: payload.id,
        },

        select: {
          id: true,
          txRef: true,
          status: true,
          amount: true,
          currency: true,
          challengeId: true,
          paymentMethod: true,
        },
      });

    if (!payment) {
      return NextResponse.json(
        {
          error: "Payment not found.",
        },
        { status: 404 }
      );
    }

    /*
     * RETURN CURRENT STATUS
     */
    return NextResponse.json({
      success: true,

      payment: {
        id: payment.id,
        txRef: payment.txRef,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        challengeId:
          payment.challengeId,
        paymentMethod:
          payment.paymentMethod,
      },
    });
  } catch (error: any) {
    console.error(
      "NOWPayments status error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Failed to check payment status.",
      },
      { status: 500 }
    );
  }
}