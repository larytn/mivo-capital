import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

async function generateUniqueReferralCode() {
  while (true) {
    const code = `MIVO${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;

    const exists = await prisma.user.findUnique({
      where: { referralCode: code },
      select: { id: true },
    });

    if (!exists) return code;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    const referralCode =
      body.referralCode?.trim().toUpperCase() || "";

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account already exists with this email." },
        { status: 400 }
      );
    }

    let referrer: { id: string } | null = null;

    if (referralCode) {
      referrer = await prisma.user.findUnique({
        where: { referralCode },
        select: { id: true },
      });

      if (!referrer) {
        return NextResponse.json(
          { error: "Invalid referral code." },
          { status: 400 }
        );
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newReferralCode =
      await generateUniqueReferralCode();

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        authProvider: "EMAIL",

        // Verification temporarily disabled
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,

        referralCode: newReferralCode,
        referredById: referrer?.id ?? null,
      },

      select: {
        id: true,
        name: true,
        email: true,
        referralCode: true,
      },
    });

    return NextResponse.json(
      {
        message: "Account created successfully.",
        user,
        requiresEmailVerification: false,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("SIGNUP ERROR:", error);

    return NextResponse.json(
      { error: "Unable to create your account." },
      { status: 500 }
    );
  }
}