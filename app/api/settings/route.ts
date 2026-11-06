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

function nextCalendarMonth(date: Date) {
  const next = new Date(date);
  const originalDay = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(originalDay, lastDay));
  return next;
}

function nicknameChangeState(nicknameChangedAt: Date | null, now = new Date()) {
  const nicknameChangeAvailableAt = nicknameChangedAt ? nextCalendarMonth(nicknameChangedAt) : null;
  return {
    canChangeNickname: !nicknameChangeAvailableAt || nicknameChangeAvailableAt <= now,
    nicknameChangeAvailableAt: nicknameChangeAvailableAt?.toISOString() ?? null,
  };
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
        nicknameChangedAt: true,
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
        ...nicknameChangeState(user.nicknameChangedAt),
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
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, nickname: true, nicknameChangedAt: true, avatarUrl: true },
      });
      if (!currentUser) return json({ error: "Account not found." }, 404);

      if (Object.prototype.hasOwnProperty.call(body, "name") &&
        (typeof body.name !== "string" || body.name.trim() !== currentUser.name)) {
        return json({ error: "Full name cannot be changed in account settings. Contact Support if it needs correction." }, 400);
      }

      const nickname = typeof body.nickname === "string" ? body.nickname.trim() : "";
      if (!/^[\p{L}\p{N}._-]{3,24}$/u.test(nickname)) {
        return json({ error: "Nickname must be 3–24 letters, numbers, dots, underscores or hyphens." }, 400);
      }

      const isNicknameChange = nickname !== currentUser.nickname;
      const now = new Date();
      if (isNicknameChange) {
        const changeState = nicknameChangeState(currentUser.nicknameChangedAt, now);
        if (!changeState.canChangeNickname) {
          return json({
            error: `You can change your nickname again on ${new Date(changeState.nicknameChangeAvailableAt!).toLocaleDateString("en", { dateStyle: "long", timeZone: "UTC" })}. Contact Support if you need help sooner.`,
            ...changeState,
          }, 429);
        }
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

      const profileData = {
        ...(isNicknameChange ? { nickname, nicknameChangedAt: now } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      };

      if (isNicknameChange) {
        const update = await prisma.user.updateMany({
          where: {
            id: userId,
            nickname: currentUser.nickname,
            nicknameChangedAt: currentUser.nicknameChangedAt,
          },
          data: profileData,
        });
        if (!update.count) {
          const latestUser = await prisma.user.findUnique({ where: { id: userId }, select: { nicknameChangedAt: true } });
          const changeState = nicknameChangeState(latestUser?.nicknameChangedAt ?? null);
          return json({ error: "Your profile changed while you were saving. Reload and try again.", ...changeState }, 409);
        }
      } else if (avatarUrl !== undefined && avatarUrl !== currentUser.avatarUrl) {
        await prisma.user.update({ where: { id: userId }, data: { avatarUrl } });
      }

      const updatedUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, nickname: true, nicknameChangedAt: true, avatarUrl: true, email: true },
      });
      if (!updatedUser) return json({ error: "Account not found." }, 404);

      return json({
        message: "Profile updated successfully.",
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          nickname: updatedUser.nickname,
          avatarUrl: updatedUser.avatarUrl,
          email: updatedUser.email,
          ...nicknameChangeState(updatedUser.nicknameChangedAt),
        },
      });
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
