import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

function isAdmin(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const admin = token ? verifyToken(token) as { id?: string; userId?: string; role?: string } | null : null;
  return admin?.role === "ADMIN";
}

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  try {
    const posts = await prisma.communityPost.findMany({
      where: { moderationStatus: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
      },
    });
    return NextResponse.json(
      { posts },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("ADMIN COMMUNITY REVIEW GET ERROR:", error);
    return NextResponse.json({ error: "Unable to load posts for review." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id.trim() : "";
    const moderationStatus = body.action === "approve"
      ? "APPROVED"
      : body.action === "reject"
        ? "REJECTED"
        : "";
    if (!id || !moderationStatus) {
      return NextResponse.json({ error: "Choose a pending post and an approval action." }, { status: 400 });
    }

    const result = await prisma.communityPost.updateMany({
      where: { id, moderationStatus: "PENDING" },
      data: { moderationStatus },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "This post is no longer awaiting review." }, { status: 404 });
    }
    return NextResponse.json({ updated: true, moderationStatus });
  } catch (error) {
    console.error("ADMIN COMMUNITY REVIEW PATCH ERROR:", error);
    return NextResponse.json({ error: "Unable to update this post." }, { status: 500 });
  }
}
