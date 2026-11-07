import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

function session(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  return token ? verifyToken(token) as { id?: string; userId?: string; role?: string } | null : null;
}

export async function GET(request: NextRequest) {
  const user = session(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const type = request.nextUrl.searchParams.get("type") || "";
  const allowed = ["ANNOUNCEMENT", "ACADEMY"];
  if (!allowed.includes(type)) return NextResponse.json({ error: "Unknown content type." }, { status: 400 });
  const userId = user.id || user.userId;
  if (!userId) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  try {
    const [items, readState] = await Promise.all([
      prisma.ecosystemContent.findMany({ where: { type, published: true }, orderBy: { createdAt: "desc" }, include: { createdBy: { select: { name: true } } } }),
      type === "ANNOUNCEMENT" || type === "ACADEMY"
        ? prisma.ecosystemContentReadState.findUnique({ where: { userId_contentType: { userId, contentType: type } } })
        : Promise.resolve(null),
    ]);
    const unreadCount = type === "ANNOUNCEMENT" || type === "ACADEMY"
      ? items.filter((item) => !readState || item.createdAt > readState.lastViewedAt).length
      : 0;
    return NextResponse.json({ items, unreadCount });
  } catch (error) {
    console.error("ECOSYSTEM CONTENT GET ERROR:", error);
    return NextResponse.json({ error: "Unable to load this section." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = session(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Only the Mivo team can publish content." }, { status: 403 });
  const createdById = user.id || user.userId;
  if (!createdById) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  try {
    const body = await request.json();
    const type = typeof body.type === "string" ? body.type : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const text = typeof body.body === "string" ? body.body.trim() : "";
    if (!(type === "ANNOUNCEMENT" || type === "ACADEMY") || !title || !text) return NextResponse.json({ error: "Choose Academy or Announcement and provide a title and content." }, { status: 400 });
    const item = await prisma.ecosystemContent.create({ data: { type, title, body: text, symbol: typeof body.symbol === "string" ? body.symbol.trim().toUpperCase() || null : null, direction: typeof body.direction === "string" ? body.direction.trim() || null : null, entry: typeof body.entry === "string" ? body.entry.trim() || null : null, stopLoss: typeof body.stopLoss === "string" ? body.stopLoss.trim() || null : null, takeProfit: typeof body.takeProfit === "string" ? body.takeProfit.trim() || null : null, createdById } });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("ECOSYSTEM CONTENT POST ERROR:", error);
    return NextResponse.json({ error: "Unable to publish this content." }, { status: 500 });
  }
}
