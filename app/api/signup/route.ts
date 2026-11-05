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
    const nickname = typeof body.nickname === "string" ? body.nickname.trim() : "";
    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    const referralCode =
      body.referralCode?.trim().toUpperCase() || "";

    if (!name || !nickname || !email || !password) {
      return NextResponse.json(
        { error: "Full name, nickname, email and password are required." },
        { status: 400 }
      );
    }

    if (!/^[\p{L}\p{N}._-]{3,24}$/u.test(nickname)) {
      return NextResponse.json(
        { error: "Nickname must be 3–24 letters, numbers, dots, underscores or hyphens." },
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

    const existingNickname = await prisma.user.findFirst({
      where: { nickname: { equals: nickname, mode: "insensitive" } },
      select: { id: true },
    });
    if (existingNickname) {
      return NextResponse.json(
        { error: "That nickname is already in use. Choose another one." },
        { status: 409 }
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
        nickname,
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
        nickname: true,
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

    if ((error as { code?: string } | null)?.code === "P2002") {
      return NextResponse.json(
        { error: "That email or nickname is already in use." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Unable to create your account." },
      { status: 500 }
    );
  }
}
