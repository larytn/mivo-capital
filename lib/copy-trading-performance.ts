import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ProviderMetrics } from "@/lib/copy-trading-stats";

type AggregateRow = {
  userId: string;
  totalTrades: number;
  netPnl: number;
  maxDrawdown: number;
  wins: number;
  gains: number;
  losses: number;
};
type CurveRow = { date: Date; value: number };

export async function providerPerformanceForUsers(userIds: string[]) {
  const ids = [...new Set(userIds)].filter(Boolean);
  const result = new Map<string, ProviderMetrics>();
  if (ids.length === 0) return result;

  const [aggregates, connections] = await Promise.all([
    prisma.$queryRaw<AggregateRow[]>`
      WITH results AS (
        SELECT "userId", "id", "closedAt", ("pnl" - "fees") AS net
        FROM "JournalTrade"
        WHERE "userId" IN (${Prisma.join(ids)})
          AND "source" = 'MT5' AND "status" = 'CLOSED' AND "closedAt" IS NOT NULL
      ), cumulative AS (
        SELECT "userId", "id", "closedAt", net,
          SUM(net) OVER (PARTITION BY "userId" ORDER BY "closedAt", "id" ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS total
        FROM results
      ), peaks AS (
        SELECT "userId", "closedAt", "id", net, total,
          GREATEST(MAX(total) OVER (PARTITION BY "userId" ORDER BY "closedAt", "id" ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW), 0) AS peak
        FROM cumulative
      )
      SELECT "userId", COUNT(*)::int AS "totalTrades",
        COALESCE(SUM(net), 0)::float8 AS "netPnl",
        GREATEST(COALESCE(MAX(peak - total), 0), 0)::float8 AS "maxDrawdown",
        COUNT(*) FILTER (WHERE net > 0)::int AS wins,
        COALESCE(SUM(GREATEST(net, 0)), 0)::float8 AS gains,
        COALESCE(SUM(GREATEST(-net, 0)), 0)::float8 AS losses
      FROM peaks GROUP BY "userId"
    `,
    prisma.brokerConnection.findMany({ where: { userId: { in: ids } }, select: { userId: true, status: true, lastSyncedAt: true } }),
  ]);
  const connectionByUser = new Map(connections.map((connection) => [connection.userId, connection]));
  for (const userId of ids) {
    const row = aggregates.find((item) => item.userId === userId);
    const connection = connectionByUser.get(userId);
    const verified = connection?.status === "CONNECTED" && (row?.totalTrades ?? 0) > 0;
    const losses = row?.losses ?? 0;
    const gains = row?.gains ?? 0;
    result.set(userId, {
      verified,
      sourceLabel: verified ? "MT5-synced history" : "No verified broker history",
      netPnl: verified ? row!.netPnl : null,
      maxDrawdown: verified ? row!.maxDrawdown : null,
      winRate: verified ? (row!.wins / row!.totalTrades) * 100 : null,
      profitFactor: verified ? (losses === 0 ? (gains > 0 ? null : 0) : gains / losses) : null,
      profitFactorInfinite: Boolean(verified && losses === 0 && gains > 0),
      totalTrades: verified ? row!.totalTrades : null,
      curve: [],
      lastSyncedAt: connection?.lastSyncedAt?.toISOString() ?? null,
    });
  }
  return result;
}

export async function providerPerformanceWithCurve(userId: string): Promise<ProviderMetrics> {
  const performance = (await providerPerformanceForUsers([userId])).get(userId);
  if (!performance?.verified) return performance ?? {
    verified: false, sourceLabel: "No verified broker history", netPnl: null,
    maxDrawdown: null, winRate: null, profitFactor: null, profitFactorInfinite: false,
    totalTrades: null, curve: [], lastSyncedAt: null,
  };

  const rows = await prisma.$queryRaw<CurveRow[]>`
    WITH curve AS (
      SELECT "closedAt" AS date,
        SUM("pnl" - "fees") OVER (ORDER BY "closedAt", "id" ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS value,
        ROW_NUMBER() OVER (ORDER BY "closedAt", "id") AS row_num,
        COUNT(*) OVER () AS row_total
      FROM "JournalTrade"
      WHERE "userId" = ${userId} AND "source" = 'MT5' AND "status" = 'CLOSED' AND "closedAt" IS NOT NULL
    )
    SELECT date, value::float8 AS value FROM curve
    WHERE row_num = 1 OR row_num = row_total
      OR MOD(row_num, GREATEST(CEIL(row_total::numeric / 250)::int, 1)) = 0
    ORDER BY row_num
  `;
  return { ...performance, curve: [{ date: "", value: 0 }, ...rows.map((row) => ({ date: row.date.toISOString(), value: row.value }))] };
}
