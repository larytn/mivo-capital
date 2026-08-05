import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const token = body.token;
    const password = body.password;

    if (!token || !password) {
      return NextResponse.json(
        {
          error: "Reset token and new password are required.",
        },
        {
          status: 400,
        }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          error: "Password must be at least 8 characters.",
        },
        {
          status: 400,
        }
      );
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          error:
            "This password reset link is invalid or has expired.",
        },
        {
          status: 400,
        }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      },
    });

    return NextResponse.json({
      message: "Password reset successfully.",
    });
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);

    return NextResponse.json(
      {
        error: "Unable to reset password.",
      },
      {
        status: 500,
      }
    );
  }
}