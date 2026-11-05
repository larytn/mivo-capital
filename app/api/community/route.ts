import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { isCommunityModerationConfigured, reviewCommunityPost } from "@/lib/community-moderation";
import { parseCommunityPostDraft } from "@/lib/community-post-input";

const MAX_POSTS_PER_WINDOW = 5;
const POST_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

function memberId(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) return null;
  const payload = verifyToken(token) as { id?: string; userId?: string } | null;
  return payload?.id || payload?.userId || null;
}

function databaseFailureMessage(error: unknown, stage: "check_rate_limit" | "save_post") {
  const prismaError = error as { code?: unknown; errorCode?: unknown; message?: unknown } | null;
  const message = typeof prismaError?.message === "string" ? prismaError.message : "";
  const code = typeof prismaError?.code === "string"
    ? prismaError.code
    : typeof prismaError?.errorCode === "string"
      ? prismaError.errorCode
      : message.match(/\bP\d{4}\b/)?.[0];

  if (error instanceof Error && error.name === "PrismaClientValidationError") {
    const field = message.match(/(?:Unknown argument|Argument) `([^`]+)`/i)?.[1];
    const operation = stage === "save_post" ? "post data" : "the post limit query";
    return field
      ? `The server's Prisma client rejected the ${field} field in ${operation}. Regenerate Prisma Client and restart the app.`
      : `The server's Prisma client rejected ${operation}. Regenerate Prisma Client and restart the app.`;
  }

  if (
    code === "P2024" ||
    /timed out fetching a new connection from the connection pool/i.test(message)
  ) {
    return "Mivo is busy handling database requests. Your post was not submitted; please try again shortly.";
  }

  if (code === "P1001" || code === "P1011") {
    return "Mivo could not connect to its database, so your post was not submitted. Please try again later.";
  }
  if (code === "P2021" || code === "P2022") {
    return "The community database setup is incomplete. Apply the pending Prisma migrations, then try again.";
  }
  if (code === "P2003") {
    return "Your sign-in is not linked to an active Mivo member record. Sign out, sign in again, then retry.";
  }
  if (code === "P2000") {
    return "Some post data is too long to save. Shorten the title or text, then try again.";
  }
  if (code === "P2002") {
    return "This post could not be saved because it conflicts with an existing record. Please try again.";
  }
  const reference = code || (error instanceof Error ? error.name : "UnknownError");
  return `Mivo could not save your post (server reference: ${reference}). It was not submitted.`;
}

export async function GET(request: NextRequest) {
  const userId = memberId(request);
  if (!userId) return NextResponse.json({ error: "Sign in to view the community." }, { status: 401 });
  try {
    const [posts, currentUser] = await Promise.all([prisma.communityPost.findMany({
      where: {
        OR: [
          { moderationStatus: "APPROVED" },
          { authorId: userId },
        ],
      },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      take: Math.min(60, Math.max(1, Number.parseInt(request.nextUrl.searchParams.get("limit") || "60", 10) || 60)),
      include: {
        author: { select: { id: true, name: true, nickname: true, avatarUrl: true, role: true } },
        likes: { where: { userId }, select: { userId: true } },
        comments: { orderBy: { createdAt: "asc" }, include: { author: { select: { id: true, name: true, nickname: true, avatarUrl: true } } } },
        _count: { select: { likes: true } },
      },
    }), prisma.user.findUnique({ where: { id: userId }, select: { nickname: true, avatarUrl: true } })]);
    return NextResponse.json(
      {
        currentUserId: userId,
        currentUser,
        moderationConfigured: isCommunityModerationConfigured(),
        posts: posts.map(({ _count, likes, ...post }) => ({
          ...post,
          likedByMe: likes.length > 0,
          likesCount: _count.likes,
        })),
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("COMMUNITY GET ERROR:", error);
    return NextResponse.json({ error: "Unable to load community posts." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userId = memberId(request);
  if (!userId) return NextResponse.json({ error: "Sign in to publish." }, { status: 401 });
  let stage: "validate" | "check_rate_limit" | "save_post" = "validate";
  try {
    const parsed = parseCommunityPostDraft(await request.json(), userId);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const draft = parsed.draft;
    stage = "check_rate_limit";
    const recentPostCount = await prisma.communityPost.count({
      where: {
        authorId: userId,
        createdAt: { gte: new Date(Date.now() - POST_RATE_LIMIT_WINDOW_MS) },
      },
    });
    if (recentPostCount >= MAX_POSTS_PER_WINDOW) {
      return NextResponse.json(
        { error: "You have submitted several posts recently. Please wait a few minutes before trying again." },
        { status: 429 },
      );
    }

    const moderation = await reviewCommunityPost(draft);
    const moderationStatus = moderation.decision === "APPROVED"
      ? "APPROVED"
      : moderation.decision === "REJECTED"
        ? "REJECTED"
        : "PENDING";
    stage = "save_post";
    const savedPost = await prisma.communityPost.create({
      data: {
        author: { connect: { id: userId } },
        ...draft,
        moderationStatus,
      },
    });

    if (moderationStatus === "APPROVED") {
      return NextResponse.json(
        { submitted: true, postId: savedPost.id, moderationStatus, message: "Your post passed Mivo’s review and is now live." },
        { status: 201 },
      );
    }
    if (moderationStatus === "REJECTED") {
      return NextResponse.json(
        { submitted: true, postId: savedPost.id, moderationStatus, message: moderation.reason },
        { status: 201 },
      );
    }

    return NextResponse.json(
      {
        submitted: true,
        postId: savedPost.id,
        moderationStatus,
        message: moderation.reason,
      },
      { status: 202 },
    );
  } catch (error) {
    const errorCode = (error as { code?: unknown; errorCode?: unknown } | null)?.code ??
      (error as { errorCode?: unknown } | null)?.errorCode;
    console.error(
      "COMMUNITY POST ERROR:",
      { stage, name: error instanceof Error ? error.name : "Unknown error", code: errorCode },
    );
    if (stage === "check_rate_limit" || stage === "save_post") {
      return NextResponse.json({ error: databaseFailureMessage(error, stage) }, { status: 503 });
    }
    return NextResponse.json({ error: "Unable to publish this post." }, { status: 500 });
  }
}
