import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { databaseErrorMessage } from "@/lib/database-error";
import { CHAT_STICKERS } from "@/lib/chat-catalog";

export const dynamic = "force-dynamic";

function memberId(request: NextRequest): string | null {
  const token = request.cookies.get("token")?.value;
  if (!token) return null;
  const payload = verifyToken(token) as { id?: string; userId?: string } | null;
  return payload?.id || payload?.userId || null;
}

function isMivoStickerUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "res.cloudinary.com" &&
      url.pathname.includes("/mivo-capital/member-uploads/") &&
      /\.(gif|png|jpe?g|webp)$/i.test(url.pathname);
  } catch {
    return false;
  }
}

function savedKey(stickerKey: string | null, mediaUrl: string | null) {
  return stickerKey ? `catalog:${stickerKey}` : `url:${mediaUrl}`;
}

export async function GET(request: NextRequest) {
  const userId = memberId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const stickers = await prisma.chatSavedSticker.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, key: true, stickerKey: true, mediaUrl: true, label: true, createdAt: true },
    });
    return NextResponse.json({ stickers }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("CHAT SAVED STICKERS GET ERROR:", error);
    return NextResponse.json({ error: databaseErrorMessage(error, "Saved stickers") }, { status: 503 });
  }
}

export async function PUT(request: NextRequest) {
  const userId = memberId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const stickerKey = typeof body.stickerKey === "string" ? body.stickerKey : null;
    const mediaUrl = isMivoStickerUrl(body.mediaUrl) ? body.mediaUrl : null;
    const sticker = stickerKey ? CHAT_STICKERS.find((item) => item.key === stickerKey) : null;
    if (!sticker && !mediaUrl) {
      return NextResponse.json({ error: "Choose a Mivo sticker to save." }, { status: 400 });
    }

    const key = savedKey(sticker?.key ?? null, mediaUrl);
    const saved = await prisma.chatSavedSticker.upsert({
      where: { userId_key: { userId, key } },
      create: {
        userId,
        key,
        stickerKey: sticker?.key ?? null,
        mediaUrl,
        label: sticker?.label ?? "Saved sticker",
      },
      update: {},
      select: { id: true, key: true, stickerKey: true, mediaUrl: true, label: true, createdAt: true },
    });
    return NextResponse.json({ sticker: saved });
  } catch (error) {
    console.error("CHAT SAVED STICKER PUT ERROR:", error);
    return NextResponse.json({ error: databaseErrorMessage(error, "Saved stickers") }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  const userId = memberId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const stickerKey = typeof body.stickerKey === "string" ? body.stickerKey : null;
    const mediaUrl = isMivoStickerUrl(body.mediaUrl) ? body.mediaUrl : null;
    const sticker = stickerKey ? CHAT_STICKERS.find((item) => item.key === stickerKey) : null;
    if (!sticker && !mediaUrl) {
      return NextResponse.json({ error: "Choose a sticker to remove." }, { status: 400 });
    }
    const key = savedKey(sticker?.key ?? null, mediaUrl);
    await prisma.chatSavedSticker.deleteMany({ where: { userId, key } });
    return NextResponse.json({ deleted: true, key });
  } catch (error) {
    console.error("CHAT SAVED STICKER DELETE ERROR:", error);
    return NextResponse.json({ error: databaseErrorMessage(error, "Saved stickers") }, { status: 503 });
  }
}
