import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: "Email address is required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    // Always return the same message so people
    // cannot check which emails are registered.
    if (!user) {
      return NextResponse.json({
        message:
          "If an account exists with this email, a password reset link has been sent.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    const resetTokenExpiry = new Date(
      Date.now() + 30 * 60 * 1000
    );

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordResetToken: resetTokenHash,
        passwordResetExpiresAt: resetTokenExpiry,
      },
    });

    /*
      Email sending will be connected next.

      The real reset link will look like:

      https://yourdomain.com/reset-password?token=RESET_TOKEN
    */

    if (process.env.NODE_ENV !== "production") {
      console.log(
        "PASSWORD RESET LINK:",
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`
      );
    }

    return NextResponse.json({
      message:
        "If an account exists with this email, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);

    return NextResponse.json(
      {
        error: "Unable to process password reset.",
      },
      {
        status: 500,
      }
    );
  }
}
