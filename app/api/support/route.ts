import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

function getUserId(request: NextRequest) {
  const token = request.cookies.get("token")?.value;

  if (!token) return null;

  const payload = verifyToken(token) as {
    id: string;
  } | null;

  return payload?.id ?? null;
}

// GET USER'S SUPPORT TICKETS
export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const tickets = await prisma.supportTicket.findMany({
      where: {
        userId,
      },

      select: {
        id: true,
        subject: true,
        message: true,
        status: true,
        adminReply: true,
        createdAt: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      tickets,
    });
  } catch (error: any) {
    console.error("SUPPORT GET ERROR:", error);

    return NextResponse.json(
      {
        error:
          error.message ||
          "Failed to load support tickets.",
      },
      { status: 500 }
    );
  }
}

// CREATE SUPPORT TICKET
export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { subject, message } = await request.json();

    if (!subject?.trim() || !message?.trim()) {
      return NextResponse.json(
        {
          error: "Subject and message are required.",
        },
        { status: 400 }
      );
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId,
        subject: subject.trim(),
        message: message.trim(),
        status: "OPEN",
      },
    });

    return NextResponse.json(
      {
        message: "Support ticket submitted.",
        ticket,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("SUPPORT POST ERROR:", error);

    return NextResponse.json(
      {
        error:
          error.message ||
          "Failed to submit support ticket.",
      },
      { status: 500 }
    );
  }
}