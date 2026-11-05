import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  MetaApiError,
  metaApiClientRequest,
  metaApiRequest,
  type MetaApiAccount,
  type MetaApiDeal,
  type MetaApiPosition,
} from "@/lib/metaapi";
import { setMt5ConnectionStatus, type Mt5ConnectionRecord } from "@/lib/mt5-db";

type SyncConnection = Mt5ConnectionRecord & { providerAccountId: string };

function finite(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function validDate(value: unknown): Date | null {
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function tradeDirection(type: unknown): "BUY" | "SELL" {
  return typeof type === "string" && type.includes("SELL") ? "SELL" : "BUY";
}

function dealIsClose(deal: MetaApiDeal) {
  return ["DEAL_ENTRY_OUT", "DEAL_ENTRY_OUT_BY", "DEAL_ENTRY_INOUT"].includes(
    String(deal.entryType),
  );
}

function calculateClosedTrade(deals: MetaApiDeal[]) {
  const ordered = deals
    .filter((deal) => validDate(deal.time))
    .sort((a, b) => new Date(a.time!).getTime() - new Date(b.time!).getTime());
  const entries = ordered.filter((deal) => deal.entryType === "DEAL_ENTRY_IN");
  const exits = ordered.filter(dealIsClose);
  const firstEntry = entries[0];
  const lastExit = exits[exits.length - 1];
  if (!firstEntry || !lastExit) return null;

  const entryVolume = entries.reduce((sum, deal) => sum + Math.max(0, finite(deal.volume)), 0);
  const exitVolume = exits.reduce((sum, deal) => sum + Math.max(0, finite(deal.volume)), 0);
  const entryWeight = entryVolume || 1;
  const exitWeight = exitVolume || 1;
  const entryPrice = entries.reduce(
    (sum, deal) => sum + finite(deal.price) * Math.max(0, finite(deal.volume)),
    0,
  ) / entryWeight;
  const exitPrice = exits.reduce(
    (sum, deal) => sum + finite(deal.price) * Math.max(0, finite(deal.volume)),
    0,
  ) / exitWeight;
  const fees = Math.abs(ordered.reduce((sum, deal) => sum + finite(deal.commission), 0));
  const pnl = ordered.reduce(
    (sum, deal) => sum + finite(deal.profit) + finite(deal.swap),
    0,
  );
  const openedAt = validDate(firstEntry.time);
  const closedAt = validDate(lastExit.time);
  if (!openedAt || !closedAt || !Number.isFinite(entryPrice) || entryPrice <= 0) return null;

  return {
    symbol: String(firstEntry.symbol || lastExit.symbol || "UNKNOWN").toUpperCase(),
    direction: tradeDirection(firstEntry.type),
    entryPrice,
    exitPrice: Number.isFinite(exitPrice) && exitPrice > 0 ? exitPrice : null,
    currentPrice: Number.isFinite(exitPrice) && exitPrice > 0 ? exitPrice : entryPrice,
    quantity: entryVolume || exitVolume || null,
    openedAt,
    closedAt,
    pnl,
    fees,
    stopLoss: finite(firstEntry.stopLoss) || null,
    takeProfit: finite(firstEntry.takeProfit) || null,
  };
}

async function upsertJournalTrade(
  connection: SyncConnection,
  externalId: string,
  trade: {
    symbol: string;
    direction: "BUY" | "SELL";
    status: "OPEN" | "CLOSED";
    entryPrice: number;
    exitPrice: number | null;
    currentPrice: number | null;
    stopLoss: number | null;
    takeProfit: number | null;
    quantity: number | null;
    pnl: number;
    fees: number;
    openedAt: Date;
    closedAt: Date | null;
  },
) {
  const id = randomUUID();
  const now = new Date();
  await prisma.$executeRaw`
    INSERT INTO "JournalTrade" (
      "id", "userId", "symbol", "direction", "status", "entryPrice", "exitPrice",
      "stopLoss", "takeProfit", "currentPrice", "quantity", "pnl", "fees", "openedAt", "closedAt",
      "strategy", "notes", "source", "externalId", "brokerConnectionId", "isPublic",
      "createdAt", "updatedAt"
    ) VALUES (
      ${id}, ${connection.userId}, ${trade.symbol}, ${trade.direction}, ${trade.status},
      ${trade.entryPrice}, ${trade.exitPrice}, ${trade.stopLoss}, ${trade.takeProfit}, ${trade.currentPrice},
      ${trade.quantity}, ${trade.pnl}, ${trade.fees}, ${trade.openedAt}, ${trade.closedAt},
      'MT5 auto-sync', 'Imported automatically from MetaTrader 5.', 'MT5', ${externalId},
      ${connection.id}, false, ${now}, ${now}
    )
    ON CONFLICT ("userId", "source", "externalId") DO UPDATE SET
      "symbol" = EXCLUDED."symbol",
      "direction" = EXCLUDED."direction",
      "status" = EXCLUDED."status",
      "entryPrice" = EXCLUDED."entryPrice",
      "exitPrice" = EXCLUDED."exitPrice",
      "stopLoss" = EXCLUDED."stopLoss",
      "takeProfit" = EXCLUDED."takeProfit",
      "currentPrice" = EXCLUDED."currentPrice",
      "quantity" = EXCLUDED."quantity",
      "pnl" = EXCLUDED."pnl",
      "fees" = EXCLUDED."fees",
      "openedAt" = EXCLUDED."openedAt",
      "closedAt" = EXCLUDED."closedAt",
      "strategy" = EXCLUDED."strategy",
      "notes" = COALESCE("JournalTrade"."notes", EXCLUDED."notes"),
      "brokerConnectionId" = EXCLUDED."brokerConnectionId",
      "updatedAt" = CASE
        WHEN "JournalTrade"."symbol" IS DISTINCT FROM EXCLUDED."symbol"
          OR "JournalTrade"."direction" IS DISTINCT FROM EXCLUDED."direction"
          OR "JournalTrade"."status" IS DISTINCT FROM EXCLUDED."status"
          OR "JournalTrade"."entryPrice" IS DISTINCT FROM EXCLUDED."entryPrice"
          OR "JournalTrade"."exitPrice" IS DISTINCT FROM EXCLUDED."exitPrice"
          OR "JournalTrade"."stopLoss" IS DISTINCT FROM EXCLUDED."stopLoss"
          OR "JournalTrade"."takeProfit" IS DISTINCT FROM EXCLUDED."takeProfit"
          OR "JournalTrade"."currentPrice" IS DISTINCT FROM EXCLUDED."currentPrice"
        THEN GREATEST(EXCLUDED."updatedAt", "JournalTrade"."updatedAt" + INTERVAL '1 millisecond')
        ELSE "JournalTrade"."updatedAt"
      END
  `;
}

async function getHistoryDeals(
  region: string,
  providerAccountId: string,
  start: Date,
  end: Date,
) {
  const accountPath = `/users/current/accounts/${encodeURIComponent(providerAccountId)}`;
  const startPath = encodeURIComponent(start.toISOString());
  const endPath = encodeURIComponent(end.toISOString());
  const deals: MetaApiDeal[] = [];

  for (let offset = 0; offset < 10_000; offset += 1000) {
    const page = await metaApiClientRequest<MetaApiDeal[]>(
      region,
      `${accountPath}/history-deals/time/${startPath}/${endPath}?offset=${offset}&limit=1000`,
    );
    if (!Array.isArray(page) || page.length === 0) break;
    deals.push(...page);
    if (page.length < 1000) break;
  }
  return deals;
}

export async function syncMt5Connection(connection: SyncConnection) {
  const accountResult = await metaApiRequest<MetaApiAccount>(
    `/users/current/accounts/${encodeURIComponent(connection.providerAccountId)}`,
  );
  const account = accountResult.data;
  if (!account) throw new MetaApiError("MetaApi returned no account status.", 502);

  if (account.state === "DRAFT") {
    await setMt5ConnectionStatus(connection.id, "AWAITING_CREDENTIALS");
    return { status: "AWAITING_CREDENTIALS", imported: 0, open: 0 };
  }

  if (account.state !== "DEPLOYED" || account.connectionStatus !== "CONNECTED") {
    await setMt5ConnectionStatus(connection.id, "PENDING");
    return { status: "PENDING", imported: 0, open: 0 };
  }

  if (!account.region) {
    throw new MetaApiError("MetaApi has not assigned a region to this MT5 account yet.", 502);
  }

  const accountPath = `/users/current/accounts/${encodeURIComponent(connection.providerAccountId)}`;
  const [positions, newDeals] = await Promise.all([
    metaApiClientRequest<MetaApiPosition[]>(account.region, `${accountPath}/positions`),
    getHistoryDeals(
      account.region,
      connection.providerAccountId,
      connection.lastSyncedAt
        ? new Date(connection.lastSyncedAt.getTime() - 48 * 60 * 60 * 1000)
        : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      new Date(Date.now() + 60_000),
    ),
  ]);

  const currentPositions = Array.isArray(positions) ? positions : [];
  const positionIds = new Set(
    currentPositions.map((position) => String(position.id || "")).filter(Boolean),
  );
  const dealsByPosition = new Map<string, MetaApiDeal[]>();
  for (const deal of newDeals) {
    const positionId = deal.positionId ? String(deal.positionId) : "";
    if (!positionId) continue;
    const list = dealsByPosition.get(positionId) ?? [];
    list.push(deal);
    dealsByPosition.set(positionId, list);
  }

  let imported = 0;
  let open = 0;
  for (const position of currentPositions) {
    const positionId = String(position.id || "");
    const openedAt = validDate(position.time);
    const entryPrice = finite(position.openPrice, NaN);
    if (!positionId || !openedAt || !Number.isFinite(entryPrice) || entryPrice <= 0) continue;
    await upsertJournalTrade(connection, `${connection.providerAccountId}:${positionId}`, {
      symbol: String(position.symbol || "UNKNOWN").toUpperCase(),
      direction: tradeDirection(position.type),
      status: "OPEN",
      entryPrice,
      exitPrice: null,
      stopLoss: Number.isFinite(Number(position.stopLoss)) ? Number(position.stopLoss) : null,
      takeProfit: Number.isFinite(Number(position.takeProfit)) ? Number(position.takeProfit) : null,
      currentPrice: Number.isFinite(Number(position.currentPrice)) && Number(position.currentPrice) > 0 ? Number(position.currentPrice) : entryPrice,
      quantity: Math.max(0, finite(position.volume)),
      pnl: finite(position.profit),
      fees: Math.abs(finite(position.commission)),
      openedAt,
      closedAt: null,
    });
    open++;
  }

  for (const [positionId, dealList] of dealsByPosition) {
    if (positionIds.has(positionId) || !dealList.some(dealIsClose)) continue;
    let fullHistory = dealList;
    if (!dealList.some((deal) => deal.entryType === "DEAL_ENTRY_IN")) {
      fullHistory = await metaApiClientRequest<MetaApiDeal[]>(
        account.region,
        `${accountPath}/history-deals/position/${encodeURIComponent(positionId)}`,
      );
    }
    const trade = calculateClosedTrade(fullHistory);
    if (!trade) continue;
    await upsertJournalTrade(connection, `${connection.providerAccountId}:${positionId}`, {
      ...trade,
      status: "CLOSED",
    });
    imported++;
  }

  const syncedAt = new Date();
  await setMt5ConnectionStatus(connection.id, "CONNECTED", syncedAt);
  return { status: "CONNECTED", imported, open };
}

export async function syncMt5ConnectionForUser(userId: string) {
  const rows = await prisma.$queryRaw<SyncConnection[]>`
    SELECT "id", "userId", "providerAccountId", "server", "status", "lastSyncedAt"
    FROM "BrokerConnection"
    WHERE "userId" = ${userId}
    LIMIT 1
  `;
  const connection = rows[0];
  if (!connection) throw new MetaApiError("No MT5 account is connected yet.", 404);
  return syncMt5Connection(connection);
}

export async function getMt5ConnectionsForCron() {
  return prisma.$queryRaw<SyncConnection[]>`
    SELECT "id", "userId", "providerAccountId", "server", "status", "lastSyncedAt"
    FROM "BrokerConnection"
    ORDER BY "lastSyncedAt" ASC NULLS FIRST
    LIMIT 80
  `;
}
