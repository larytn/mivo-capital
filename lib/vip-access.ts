import { prisma } from "@/lib/prisma";

export async function getVipAccess(userId: string) {
  const member = await prisma.user.findUnique({
    where: { id: userId },
    select: { isVip: true, role: true },
  });

  if (!member) return null;
  return {
    active: member.isVip || member.role === "ADMIN",
  };
}
