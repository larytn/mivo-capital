import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { name, email, password, referralCode } = body;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    // FIND REFERRER
    let referrer = null;

    if (referralCode) {
      referrer = await prisma.user.findUnique({
        where: {
          referralCode: referralCode.trim().toUpperCase(),
        },
      });
    }

    // GENERATE UNIQUE REFERRAL CODE
    let newReferralCode = "";

    while (!newReferralCode) {
      const generated = `MIVO${Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()}`;

      const existingCode = await prisma.user.findUnique({
        where: {
          referralCode: generated,
        },
      });

      if (!existingCode) {
        newReferralCode = generated;
      }
    }

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,

        referralCode: newReferralCode,

        referredById: referrer
          ? referrer.id
          : null,
      },
    });

    return NextResponse.json(
      {
        message: "Account created successfully!",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          referralCode: user.referralCode,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("SIGNUP ERROR:", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}