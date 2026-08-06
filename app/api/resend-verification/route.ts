import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

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

    // Keep response generic so this endpoint
    // does not reveal registered email addresses.
    if (!user) {
      return NextResponse.json({
        message:
          "If an unverified account exists with this email, a new verification email has been sent.",
      });
    }

    if (user.emailVerified) {
      return NextResponse.json({
        message:
          "If an unverified account exists with this email, a new verification email has been sent.",
      });
    }

    if (user.authProvider === "GOOGLE") {
      return NextResponse.json({
        message:
          "If an unverified account exists with this email, a new verification email has been sent.",
      });
    }

    const verificationToken = crypto
      .randomBytes(32)
      .toString("hex");

    const verificationTokenHash = crypto
      .createHash("sha256")
      .update(verificationToken)
      .digest("hex");

    const verificationExpiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000
    );

    await prisma.user.update({
      where: {
        id: user.id,
      },

      data: {
        emailVerificationToken:
          verificationTokenHash,

        emailVerificationExpiresAt:
          verificationExpiresAt,
      },
    });

    await sendVerificationEmail({
      email: user.email,
      name: user.name,
      token: verificationToken,
    });

    return NextResponse.json({
      message:
        "If an unverified account exists with this email, a new verification email has been sent.",
    });
  } catch (error) {
    console.error(
      "RESEND VERIFICATION ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to resend verification email. Please try again.",
      },
      {
        status: 500,
      }
    );
  }
}