import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "mivo-secret-key"
);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    // -----------------------------
    // VALIDATION
    // -----------------------------

    if (!email || !password) {
      return NextResponse.json(
        {
          error: "Email and password are required.",
        },
        {
          status: 400,
        }
      );
    }

    // -----------------------------
    // FIND USER
    // -----------------------------

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          error: "Invalid email or password.",
        },
        {
          status: 401,
        }
      );
    }

    // -----------------------------
    // GOOGLE-ONLY ACCOUNT
    // -----------------------------

    if (!user.password) {
      return NextResponse.json(
        {
          error:
            "This account uses Google login. Please continue with Google.",
        },
        {
          status: 401,
        }
      );
    }

    // -----------------------------
    // CHECK PASSWORD
    // -----------------------------

    const validPassword = await bcrypt.compare(
      password,
      user.password
    );

    if (!validPassword) {
      return NextResponse.json(
        {
          error: "Invalid email or password.",
        },
        {
          status: 401,
        }
      );
    }

    // -----------------------------
    // EMAIL VERIFICATION
    // -----------------------------

    if (!user.emailVerified) {
      return NextResponse.json(
        {
          error:
            "Please verify your email address before logging in.",
          requiresEmailVerification: true,
          email: user.email,
        },
        {
          status: 403,
        }
      );
    }

    // -----------------------------
    // CREATE SESSION TOKEN
    // -----------------------------

    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
      role: user.role,
    })
      .setProtectedHeader({
        alg: "HS256",
      })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(JWT_SECRET);

    const cookieStore = await cookies();

    cookieStore.set("token", token, {
      httpOnly: true,

      secure:
        process.env.NODE_ENV === "production",

      sameSite: "lax",

      path: "/",

      maxAge: 60 * 60 * 24 * 7,
    });

    // -----------------------------
    // SUCCESS
    // -----------------------------

    return NextResponse.json({
      message: "Login successful.",

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return NextResponse.json(
      {
        error: "Something went wrong.",
      },
      {
        status: 500,
      }
    );
  }
}