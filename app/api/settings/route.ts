import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

type TokenPayload = { id?: string; userId?: string };

function getUserId(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) return null;

  const payload = verifyToken(token) as TokenPayload | null;
  return payload?.id || payload?.userId || null;
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

function isOwnAvatarUrl(value: string, userId: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "res.cloudinary.com" &&
      url.pathname.includes(`/mivo-capital/member-uploads/${userId}/`) &&
      /\.(png|jpe?g|webp)$/i.test(url.pathname);
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) return json({ error: "Unauthorized" }, 401);

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        nickname: true,
        avatarUrl: true,
        email: true,
        authProvider: true,
        password: true,
        createdAt: true,
      },
    });

    if (!user) return json({ error: "Account not found." }, 404);

    return json({
      user: {
        id: user.id,
        name: user.name,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        email: user.email,
        authProvider: user.authProvider,
        hasPassword: Boolean(user.password),
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("SETTINGS GET ERROR:", error);
    return json({ error: "Failed to load account settings." }, 500);
  }
}

export async function PATCH(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) return json({ error: "Unauthorized" }, 401);

  try {
    const body = await request.json();
    const action = typeof body.action === "string" ? body.action : "";

    if (action === "UPDATE_PROFILE") {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (name.length < 2 || name.length > 80) {
        return json({ error: "Enter a name between 2 and 80 characters." }, 400);
      }
      const nickname = typeof body.nickname === "string" ? body.nickname.trim() : "";
      if (!/^[\p{L}\p{N}._-]{3,24}$/u.test(nickname)) {
        return json({ error: "Nickname must be 3–24 letters, numbers, dots, underscores or hyphens." }, 400);
      }
      const nicknameInUse = await prisma.user.findFirst({
        where: { id: { not: userId }, nickname: { equals: nickname, mode: "insensitive" } },
        select: { id: true },
      });
      if (nicknameInUse) return json({ error: "That nickname is already in use. Choose another one." }, 409);

      let avatarUrl: string | null | undefined;
      if (body.avatarUrl === null || body.avatarUrl === "") avatarUrl = null;
      else if (typeof body.avatarUrl === "string") avatarUrl = body.avatarUrl.trim();
      if (avatarUrl && !isOwnAvatarUrl(avatarUrl, userId)) {
        return json({ error: "Choose a profile photo uploaded to your Mivo account." }, 400);
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: { name, nickname, ...(avatarUrl !== undefined ? { avatarUrl } : {}) },
        select: { id: true, name: true, nickname: true, avatarUrl: true, email: true },
      });
      return json({ message: "Profile updated successfully.", user });
    }

    if (action === "CHANGE_PASSWORD") {
      const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
      const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";
      const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";

      if (newPassword.length < 8) {
        return json({ error: "Password must be at least 8 characters." }, 400);
      }
      if (newPassword !== confirmPassword) {
        return json({ error: "New passwords do not match." }, 400);
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { password: true },
      });
      if (!user) return json({ error: "Account not found." }, 404);

      if (user.password) {
        if (!currentPassword || !(await bcrypt.compare(currentPassword, user.password))) {
          return json({ error: "Current password is incorrect." }, 400);
        }
      }

      const password = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({ where: { id: userId }, data: { password } });
      return json({ message: "Password updated successfully." });
    }

    return json({ error: "Choose a valid settings action." }, 400);
  } catch (error) {
    console.error("SETTINGS PATCH ERROR:", error);
    if ((error as { code?: string } | null)?.code === "P2002") {
      return json({ error: "That nickname is already in use. Choose another one." }, 409);
    }
    return json({ error: "Unable to update account settings." }, 500);
  }
}
