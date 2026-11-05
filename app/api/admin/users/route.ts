import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const admin = token ? verifyToken(token) as { id?: string; role?: string } | null : null;
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin.role !== "ADMIN") return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true, _count: { select: { communityPosts: true, journalTrades: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ users: users.map((user) => ({ ...user, posts: user._count.communityPosts, journalEntries: user._count.journalTrades })) });
  } catch (error) {
    console.error("ADMIN USERS GET ERROR:", error);
    return NextResponse.json({ error: "Failed to load members." }, { status: 500 });
  }
}
