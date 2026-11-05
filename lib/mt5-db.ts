import { prisma } from "@/lib/prisma";

export type Mt5ConnectionRecord = {
  id: string;
  userId: string;
  providerAccountId: string;
  server: string;
  status: string;
  lastSyncedAt: Date | null;
};

export function getMt5DatabaseIssueMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/P1001|P1002|Environment variable not found: DATABASE_URL|Can't reach database server/i.test(message)) {
    return "Mivo could not reach its database. Check the server database connection, then try again.";
  }
  const referencesMt5Tables = /BrokerConnection|JournalTrade/i.test(message);
  const looksLikeMissingSchema = /does not exist|undefined table|P2021|P2010|42P01/i.test(message);
  if (!referencesMt5Tables || !looksLikeMissingSchema) return null;

  return "MT5 database setup is incomplete. Apply the pending Prisma migrations to the Mivo database, then try connecting again.";
}

export async function getMt5ConnectionForUser(userId: string) {
  const rows = await prisma.$queryRaw<Mt5ConnectionRecord[]>`
    SELECT "id", "userId", "providerAccountId", "server", "status", "lastSyncedAt"
    FROM "BrokerConnection"
    WHERE "userId" = ${userId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function setMt5ConnectionStatus(
  id: string,
  status: string,
  lastSyncedAt?: Date,
) {
  if (lastSyncedAt) {
    await prisma.$executeRaw`
      UPDATE "BrokerConnection"
      SET "status" = ${status}, "lastSyncedAt" = ${lastSyncedAt}, "updatedAt" = NOW()
      WHERE "id" = ${id}
    `;
    return;
  }

  await prisma.$executeRaw`
    UPDATE "BrokerConnection"
    SET "status" = ${status}, "updatedAt" = NOW()
    WHERE "id" = ${id}
  `;
}
