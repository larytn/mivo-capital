import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

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

    // BASIC VALIDATION

    if (!name || !email || !password) {
      return NextResponse.json(
        {
          error:
            "Name, email and password are required.",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          error:
            "Password must be at least 8 characters.",
        },
        { status: 400 }
      );
    }

    // CHECK EMAIL

    const existingUser =
      await prisma.user.findUnique({
        where: {
          email,
        },
      });

    if (existingUser) {
      return NextResponse.json(
        {
          error:
            "An account with this email already exists.",
        },
        { status: 400 }
      );
    }

    // FIND AND VALIDATE REFERRER

    let referrer: {
      id: string;
    } | null = null;

    if (referralCode) {
      referrer = await prisma.user.findUnique({
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
              "Invalid referral code. Please check the code and try again.",
          },
          { status: 400 }
        );
      }
    }

    // GENERATE UNIQUE REFERRAL CODE

    let newReferralCode = "";

    while (!newReferralCode) {
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
        newReferralCode = generated;
      }
    }

    // HASH PASSWORD

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    // CREATE USER

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        authProvider: "EMAIL",

        referralCode: newReferralCode,

        referredById: referrer
          ? referrer.id
          : null,
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
        message:
          "Account created successfully!",

        user,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("SIGNUP ERROR:", error);

    return NextResponse.json(
      {
        error:
          "Something went wrong while creating your account.",
      },
      { status: 500 }
    );
  }
}