import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { reviewCommunityPost } from "@/lib/community-moderation";
import { parseCommunityPostDraft } from "@/lib/community-post-input";

const MAX_POSTS_PER_WINDOW = 5;
const POST_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

function memberId(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) return null;
  const payload = verifyToken(token) as { id?: string; userId?: string } | null;
  return payload?.id || payload?.userId || null;
}

function moderationStatus(decision: "APPROVED" | "REJECTED" | "REVIEW" | "UNAVAILABLE") {
  return decision === "APPROVED" ? "APPROVED" : decision === "REJECTED" ? "REJECTED" : "PENDING";
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const userId = memberId(request);
  if (!userId) return NextResponse.json({ error: "Sign in to edit your post." }, { status: 401 });
  const { id: postId } = await context.params;

  try {
    const parsed = parseCommunityPostDraft(await request.json(), userId);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const post = await prisma.communityPost.findUnique({ where: { id: postId }, select: { authorId: true } });
    if (!post) return NextResponse.json({ error: "This post could not be found." }, { status: 404 });
    if (post.authorId !== userId) return NextResponse.json({ error: "You can edit only your own posts." }, { status: 403 });

    const recentPostCount = await prisma.communityPost.count({
      where: {
        authorId: userId,
        createdAt: { gte: new Date(Date.now() - POST_RATE_LIMIT_WINDOW_MS) },
      },
    });
    if (recentPostCount >= MAX_POSTS_PER_WINDOW) {
      return NextResponse.json(
        { error: "You have submitted several posts recently. Please wait a few minutes before editing again." },
        { status: 429 },
      );
    }

    // Hide the changed text while the AI checks the new version.
    await prisma.communityPost.update({
      where: { id: postId },
      data: { ...parsed.draft, moderationStatus: "PENDING" },
    });

    const review = await reviewCommunityPost(parsed.draft);
    const status = moderationStatus(review.decision);
    const updated = await prisma.communityPost.updateMany({
      where: { id: postId, authorId: userId },
      data: { moderationStatus: status },
    });
    if (!updated.count) return NextResponse.json({ error: "This post no longer exists." }, { status: 404 });

    return NextResponse.json(
      {
        submitted: true,
        moderationStatus: status,
        message: status === "APPROVED"
          ? "Your edited post passed Mivo’s review and is live again."
          : review.reason,
      },
      { status: status === "PENDING" ? 202 : 200 },
    );
  } catch (error) {
    const details = error as { code?: unknown } | null;
    console.error("COMMUNITY POST EDIT ERROR:", {
      name: error instanceof Error ? error.name : "UnknownError",
      code: typeof details?.code === "string" ? details.code : undefined,
    });
    return NextResponse.json({ error: "Unable to edit this post right now. Please try again." }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const userId = memberId(request);
  if (!userId) return NextResponse.json({ error: "Sign in to delete your post." }, { status: 401 });
  const { id: postId } = await context.params;

  try {
    const result = await prisma.communityPost.deleteMany({ where: { id: postId, authorId: userId } });
    if (!result.count) return NextResponse.json({ error: "This post could not be found." }, { status: 404 });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    const details = error as { code?: unknown } | null;
    console.error("COMMUNITY POST DELETE ERROR:", {
      name: error instanceof Error ? error.name : "UnknownError",
      code: typeof details?.code === "string" ? details.code : undefined,
    });
    return NextResponse.json({ error: "Unable to delete this post right now. Please try again." }, { status: 503 });
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const userId = memberId(request);
  if (!userId) return NextResponse.json({ error: "Sign in to interact with posts." }, { status: 401 });
  const { id: postId } = await context.params;
  try {
    const post = await prisma.communityPost.findUnique({
      where: { id: postId },
      select: { moderationStatus: true },
    });
    if (!post || post.moderationStatus !== "APPROVED") {
      return NextResponse.json({ error: "This post is not available." }, { status: 404 });
    }
    const body = await request.json();
    if (body.action === "like") {
      const existing = await prisma.communityLike.findUnique({ where: { postId_userId: { postId, userId } } });
      if (existing) await prisma.communityLike.delete({ where: { id: existing.id } });
      else await prisma.communityLike.create({ data: { postId, userId } });
      const count = await prisma.communityLike.count({ where: { postId } });
      return NextResponse.json({ liked: !existing, count });
    }
    if (body.action === "comment") {
      const content = typeof body.content === "string" ? body.content.trim() : "";
      if (!content || content.length > 1200) return NextResponse.json({ error: "Write a comment up to 1,200 characters." }, { status: 400 });
      const comment = await prisma.communityComment.create({ data: { postId, authorId: userId, content }, include: { author: { select: { id: true, name: true } } } });
      return NextResponse.json({ comment }, { status: 201 });
    }
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    console.error("COMMUNITY INTERACTION ERROR:", error);
    return NextResponse.json({ error: "Unable to update this post." }, { status: 500 });
  }
}
