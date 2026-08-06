import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendVerificationEmail } from "@/lib/email";

async function generateUniqueReferralCode() {
  while (true) {
    const generated = `MIVO${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;

    const existingCode =
      await prisma.user.findUnique({
        where: {
          referralCode: generated,
        },
        select: {
          id: true,
        },
      });

    if (!existingCode) {
      return generated;
    }
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    const referralCode =
      typeof body.referralCode === "string"
        ? body.referralCode.trim().toUpperCase()
        : "";

    // -----------------------------
    // VALIDATION
    // -----------------------------

    if (!name || !email || !password) {
      return NextResponse.json(
        {
          error:
            "Name, email and password are required.",
        },
        {
          status: 400,
        }
      );
    }

    if (name.length < 2) {
      return NextResponse.json(
        {
          error:
            "Please enter your full name.",
        },
        {
          status: 400,
        }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          error:
            "Password must be at least 8 characters.",
        },
        {
          status: 400,
        }
      );
    }

    // -----------------------------
    // CHECK EXISTING USER
    // -----------------------------

    const existingUser =
      await prisma.user.findUnique({
        where: {
          email,
        },
      });

    if (existingUser) {
      if (
        existingUser.authProvider ===
        "GOOGLE"
      ) {
        return NextResponse.json(
          {
            error:
              "An account already exists with this email. Please continue with Google.",
          },
          {
            status: 400,
          }
        );
      }

      if (!existingUser.emailVerified) {
        return NextResponse.json(
          {
            error:
              "An account already exists with this email but has not been verified. Please verify your email.",
          },
          {
            status: 400,
          }
        );
      }

      return NextResponse.json(
        {
          error:
            "An account already exists with this email.",
        },
        {
          status: 400,
        }
      );
    }

    // -----------------------------
    // FIND REFERRER
    // -----------------------------

    let referrer: {
      id: string;
    } | null = null;

    if (referralCode) {
      referrer =
        await prisma.user.findUnique({
          where: {
            referralCode,
          },

          select: {
            id: true,
          },
        });

      if (!referrer) {
        return NextResponse.json(
          {
            error:
              "Invalid referral code.",
          },
          {
            status: 400,
          }
        );
      }
    }

    // -----------------------------
    // GENERATE USER REFERRAL CODE
    // -----------------------------

    const newReferralCode =
      await generateUniqueReferralCode();

    // -----------------------------
    // HASH PASSWORD
    // -----------------------------

    const hashedPassword =
      await bcrypt.hash(password, 10);

    // -----------------------------
    // EMAIL VERIFICATION TOKEN
    // -----------------------------

    const verificationToken =
      crypto.randomBytes(32).toString("hex");

    // Never store the raw verification token.
    const verificationTokenHash =
      crypto
        .createHash("sha256")
        .update(verificationToken)
        .digest("hex");

    const verificationExpiresAt =
      new Date(
        Date.now() +
          24 * 60 * 60 * 1000
      );

    // -----------------------------
    // CREATE USER
    // -----------------------------

    const user =
      await prisma.user.create({
        data: {
          name,
          email,

          password: hashedPassword,

          authProvider: "EMAIL",

          emailVerified: false,

          emailVerificationToken:
            verificationTokenHash,

          emailVerificationExpiresAt:
            verificationExpiresAt,

          referralCode:
            newReferralCode,

          referredById:
            referrer?.id ?? null,
        },

        select: {
          id: true,
          name: true,
          email: true,
          referralCode: true,
        },
      });

    // -----------------------------
    // SEND VERIFICATION EMAIL
    // -----------------------------

    try {
      await sendVerificationEmail({
        email: user.email,
        name: user.name,
        token: verificationToken,
      });
    } catch (emailError) {
      console.error(
        "SIGNUP EMAIL ERROR:",
        emailError
      );

      /*
       * Remove the newly-created unverified
       * account if the verification email
       * could not be sent.
       *
       * This allows the trader to try
       * signing up again instead of being
       * stuck with an inaccessible account.
       */
      await prisma.user.delete({
        where: {
          id: user.id,
        },
      });

      return NextResponse.json(
        {
          error:
            "We could not send your verification email. Please try again.",
        },
        {
          status: 500,
        }
      );
    }

    // -----------------------------
    // SUCCESS
    // -----------------------------

    return NextResponse.json(
      {
        message:
          "Account created successfully. Check your email and verify your account before logging in.",

        requiresEmailVerification: true,

        email: user.email,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "SIGNUP ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to create your account.",
      },
      {
        status: 500,
      }
    );
  }
}