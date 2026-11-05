import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { databaseErrorMessage } from "@/lib/database-error";

const TRACKED_TYPES = ["ANNOUNCEMENT"] as const;

export async function POST(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const user = token ? verifyToken(token) as { id?: string; userId?: string } | null : null;
  const userId = user?.id || user?.userId;
  if (!userId) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

  try {
    const body = await request.json();
    const contentType = typeof body.contentType === "string" ? body.contentType : "";
    if (!(TRACKED_TYPES as readonly string[]).includes(contentType)) {
      return NextResponse.json({ error: "Choose Announcements." }, { status: 400 });
    }

    const lastViewedAt = new Date();
    await prisma.ecosystemContentReadState.upsert({
      where: { userId_contentType: { userId, contentType } },
      create: { userId, contentType, lastViewedAt },
      update: { lastViewedAt },
    });

    return NextResponse.json({ updated: true, lastViewedAt });
  } catch (error) {
    console.error("ECOSYSTEM CONTENT READ STATE ERROR:", error);
    return NextResponse.json(
      { error: databaseErrorMessage(error, "Read status") },
      { status: 503 },
    );
  }
}
