import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { databaseErrorMessage } from "@/lib/database-error";
import { CHAT_REACTION_EMOJIS, CHAT_STICKERS } from "@/lib/chat-catalog";

export const dynamic = "force-dynamic";

const REACTION_EMOJIS = new Set<string>(CHAT_REACTION_EMOJIS);
const STICKER_LABELS = Object.fromEntries(CHAT_STICKERS.map((sticker) => [sticker.key, sticker.label]));
const GIF_LABELS: Record<string, string> = {
  rocket: "To the moon",
  celebrate: "Celebrate",
  laugh: "That was funny",
  mindblown: "Mind blown",
  focus: "Locked in",
  gg: "Good game",
  cry: "Pain",
  fire: "Fire setup",
  clap: "Well played",
};

type ReactionRecord = { emoji: string; userId: string };

function isMivoUploadUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "res.cloudinary.com" &&
      url.pathname.includes("/mivo-capital/member-uploads/") &&
      /\.(gif|png|jpe?g|webp)$/i.test(url.pathname);
  } catch {
    return false;
  }
}

function memberId(request: NextRequest): string | null {
  const token = request.cookies.get("token")?.value;
  if (!token) return null;
  const payload = verifyToken(token) as { id?: string; userId?: string } | null;
  return payload?.id || payload?.userId || null;
}

function summarizeReactions(records: ReactionRecord[], currentUserId: string) {
  const grouped = new Map<string, { count: number; reactedByMe: boolean }>();
  for (const record of records) {
    const group = grouped.get(record.emoji) ?? { count: 0, reactedByMe: false };
    group.count += 1;
    group.reactedByMe ||= record.userId === currentUserId;
    grouped.set(record.emoji, group);
  }
  return [...grouped.entries()].map(([emoji, value]) => ({ emoji, ...value }));
}

async function reactionSummary(messageId: string, currentUserId: string) {
  const records = await prisma.chatReaction.findMany({
    where: { messageId },
    select: { emoji: true, userId: true },
  });
  return summarizeReactions(records, currentUserId);
}

function serializeMessage<T extends { reactions: ReactionRecord[] }>(message: T, currentUserId: string) {
  const { reactions, ...messageData } = message;
  return { ...messageData, reactions: summarizeReactions(reactions, currentUserId) };
}

export async function GET(request: NextRequest) {
  const userId = memberId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const [records, savedStickers] = await Promise.all([
      prisma.chatMessage.findMany({
        take: 80,
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { id: true, name: true, nickname: true, avatarUrl: true, role: true } },
          reactions: { select: { emoji: true, userId: true } },
        },
      }),
      prisma.chatSavedSticker.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { id: true, key: true, stickerKey: true, mediaUrl: true, label: true, createdAt: true },
      }),
    ]);
    const messages = records.reverse().map((message) => serializeMessage(message, userId));
    return NextResponse.json(
      { messages, currentUserId: userId, savedStickers },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("CHAT GET ERROR:", error);
    return NextResponse.json({ error: databaseErrorMessage(error, "Chat") }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const authorId = memberId(request);
  if (!authorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const kind = body.kind === "STICKER" || body.kind === "GIF" ? body.kind : "TEXT";
    const mediaKey = typeof body.mediaKey === "string" ? body.mediaKey : "";
    const mediaUrl = typeof body.mediaUrl === "string" ? body.mediaUrl : "";
    let content = typeof body.content === "string" ? body.content.trim() : "";

    if (kind === "TEXT") {
      if (!content || content.length > 1500) {
        return NextResponse.json({ error: "Messages must be between 1 and 1,500 characters." }, { status: 400 });
      }
    } else if (kind === "STICKER") {
      if (mediaUrl) {
        if (!isMivoUploadUrl(mediaUrl)) {
          return NextResponse.json({ error: "Choose a sticker uploaded to Mivo." }, { status: 400 });
        }
        content = "Sticker";
      } else if (Object.prototype.hasOwnProperty.call(STICKER_LABELS, mediaKey)) {
        content = STICKER_LABELS[mediaKey];
      } else {
        return NextResponse.json({ error: "Choose an available sticker." }, { status: 400 });
      }
    } else {
      if (mediaUrl) {
        if (!isMivoUploadUrl(mediaUrl) || !mediaUrl.toLowerCase().split("?")[0].endsWith(".gif")) {
          return NextResponse.json({ error: "Choose a GIF uploaded to Mivo." }, { status: 400 });
        }
        content = "GIF";
      } else if (Object.prototype.hasOwnProperty.call(GIF_LABELS, mediaKey)) {
        content = GIF_LABELS[mediaKey];
      } else {
        return NextResponse.json({ error: "Choose an available GIF." }, { status: 400 });
      }
    }

    const message = await prisma.chatMessage.create({
      data: {
        authorId,
        content,
        kind,
        mediaKey: kind === "TEXT" || mediaUrl ? null : mediaKey,
        mediaUrl: kind !== "TEXT" && mediaUrl ? mediaUrl : null,
      },
      include: {
        author: { select: { id: true, name: true, nickname: true, avatarUrl: true, role: true } },
        reactions: { select: { emoji: true, userId: true } },
      },
    });
    return NextResponse.json({ message: serializeMessage(message, authorId) }, { status: 201 });
  } catch (error) {
    console.error("CHAT POST ERROR:", error);
    return NextResponse.json({ error: databaseErrorMessage(error, "Chat") }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  const authorId = memberId(request);
  if (!authorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id.trim() : "";
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!id) return NextResponse.json({ error: "Choose a message to edit." }, { status: 400 });
    if (!content || content.length > 1500) {
      return NextResponse.json({ error: "Messages must be between 1 and 1,500 characters." }, { status: 400 });
    }

    const updated = await prisma.chatMessage.updateMany({ where: { id, authorId, kind: "TEXT" }, data: { content } });
    if (updated.count === 0) {
      return NextResponse.json({ error: "That text message was not found or cannot be edited." }, { status: 404 });
    }

    const message = await prisma.chatMessage.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, nickname: true, avatarUrl: true, role: true } },
        reactions: { select: { emoji: true, userId: true } },
      },
    });
    if (!message) return NextResponse.json({ error: "That message is no longer available." }, { status: 404 });
    return NextResponse.json({ message: serializeMessage(message, authorId) });
  } catch (error) {
    console.error("CHAT PATCH ERROR:", error);
    return NextResponse.json({ error: databaseErrorMessage(error, "Chat") }, { status: 503 });
  }
}

export async function PUT(request: NextRequest) {
  const userId = memberId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const messageId = typeof body.id === "string" ? body.id.trim() : "";
    const emoji = typeof body.emoji === "string" ? body.emoji : "";
    if (!messageId || !REACTION_EMOJIS.has(emoji)) {
      return NextResponse.json({ error: "Choose a message and a supported reaction." }, { status: 400 });
    }
    const messageExists = await prisma.chatMessage.findUnique({ where: { id: messageId }, select: { id: true } });
    if (!messageExists) return NextResponse.json({ error: "That message is no longer available." }, { status: 404 });

    await prisma.chatReaction.upsert({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
      create: { messageId, userId, emoji },
      update: {},
    });
    return NextResponse.json({ reactions: await reactionSummary(messageId, userId) });
  } catch (error) {
    console.error("CHAT REACTION PUT ERROR:", error);
    return NextResponse.json({ error: databaseErrorMessage(error, "Chat") }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  const userId = memberId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) return NextResponse.json({ error: "Choose a message to update." }, { status: 400 });

    if (body.action === "REACTION") {
      const emoji = typeof body.emoji === "string" ? body.emoji : "";
      if (!REACTION_EMOJIS.has(emoji)) {
        return NextResponse.json({ error: "Choose a supported reaction." }, { status: 400 });
      }
      const messageExists = await prisma.chatMessage.findUnique({ where: { id }, select: { id: true } });
      if (!messageExists) return NextResponse.json({ error: "That message is no longer available." }, { status: 404 });
      await prisma.chatReaction.deleteMany({ where: { messageId: id, userId, emoji } });
      return NextResponse.json({ reactions: await reactionSummary(id, userId) });
    }

    const deleted = await prisma.chatMessage.deleteMany({ where: { id, authorId: userId } });
    if (deleted.count === 0) {
      return NextResponse.json({ error: "That message was not found or cannot be deleted." }, { status: 404 });
    }
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("CHAT DELETE ERROR:", error);
    return NextResponse.json({ error: databaseErrorMessage(error, "Chat") }, { status: 503 });
  }
}
