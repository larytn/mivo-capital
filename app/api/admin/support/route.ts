import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

function getAdmin(request: NextRequest) {
  const token = request.cookies.get("token")?.value;

  if (!token) return null;

  return verifyToken(token) as {
    id: string;
    email: string;
    role: string;
  } | null;
}

// LOAD ALL SUPPORT TICKETS
export async function GET(request: NextRequest) {
  try {
    const admin = getAdmin(request);

    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (admin.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      );
    }

    const tickets = await prisma.supportTicket.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      tickets,
    });
  } catch (error: any) {
    console.error("ADMIN SUPPORT GET ERROR:", error);

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

// REPLY / CLOSE TICKET
export async function PATCH(request: NextRequest) {
  try {
    const admin = getAdmin(request);

    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (admin.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      );
    }

    const {
      ticketId,
      status,
      adminReply,
    } = await request.json();

    if (!ticketId) {
      return NextResponse.json(
        { error: "Ticket ID is required." },
        { status: 400 }
      );
    }

    if (
      status &&
      !["OPEN", "ANSWERED", "CLOSED"].includes(status)
    ) {
      return NextResponse.json(
        { error: "Invalid ticket status." },
        { status: 400 }
      );
    }

    const existingTicket =
      await prisma.supportTicket.findUnique({
        where: {
          id: ticketId,
        },
      });

    if (!existingTicket) {
      return NextResponse.json(
        { error: "Support ticket not found." },
        { status: 404 }
      );
    }

    const ticket =
      await prisma.supportTicket.update({
        where: {
          id: ticketId,
        },

        data: {
          ...(status && {
            status,
          }),

          ...(adminReply !== undefined && {
            adminReply:
              adminReply?.trim() || null,
          }),
        },

        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

    return NextResponse.json({
      success: true,
      message:
        status === "CLOSED"
          ? "Ticket closed successfully."
          : "Support ticket updated successfully.",
      ticket,
    });
  } catch (error: any) {
    console.error("ADMIN SUPPORT PATCH ERROR:", error);

    return NextResponse.json(
      {
        error:
          error.message ||
          "Failed to update support ticket.",
      },
      { status: 500 }
    );
  }
}