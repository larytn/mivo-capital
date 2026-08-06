import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const token =
      typeof body.token === "string"
        ? body.token.trim()
        : "";

    if (!token) {
      return NextResponse.json(
        {
          error: "Verification token is required.",
        },
        {
          status: 400,
        }
      );
    }

    // Hash the raw token from the email.
    // This must match the hash stored during signup.
    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: tokenHash,
      },

      select: {
        id: true,
        email: true,
        emailVerified: true,
        emailVerificationExpiresAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          error:
            "This verification link is invalid or has already been used.",
        },
        {
          status: 400,
        }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json({
        message: "Your email is already verified.",
      });
    }

    if (
      !user.emailVerificationExpiresAt ||
      user.emailVerificationExpiresAt <
        new Date()
    ) {
      return NextResponse.json(
        {
          error:
            "This verification link has expired. Please request a new verification email.",
        },
        {
          status: 400,
        }
      );
    }

    await prisma.user.update({
      where: {
        id: user.id,
      },

      data: {
        emailVerified: true,

        // Verification tokens are one-time use.
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
      },
    });

    return NextResponse.json({
      message:
        "Email verified successfully. You can now log in to your Mivo Capital account.",
    });
  } catch (error) {
    console.error(
      "VERIFY EMAIL ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to verify your email. Please try again.",
      },
      {
        status: 500,
      }
    );
  }
}