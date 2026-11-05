import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { copyFactoryRequest, metaApiRequest, MetaApiError, type MetaApiAccount } from "@/lib/metaapi";
import { LIVE_COPY_ENABLED } from "@/lib/copy-trading-live";
import { calculateCopyTradingProfitSplit, MIVO_PROFIT_SHARE_RATE } from "@/lib/copy-trading-fees";

export const dynamic = "force-dynamic";

type CopyFactoryTransaction = {
  id?: string;
  time?: string;
  subscriberId?: string;
  strategy?: { id?: string };
  demo?: boolean;
  symbol?: string;
  positionId?: string;
  profit?: number;
  improvement?: number;
  providerCommission?: number;
  platformCommission?: number;
};

type LedgerAction = "record_collection" | "record_provider_payout" | "record_mivo_receipt";

async function getAdminId() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return null;
  const admin = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
  return admin?.role === "ADMIN" ? admin.id : null;
}

function finiteAmount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function compositeKey(strategyId: string, subscriberId: string) {
  return `${strategyId}\u0000${subscriberId}`;
}

export async function GET() {
  const adminId = await getAdminId();
  if (!adminId) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  try {
    const entries = await prisma.copyTradingLedgerEntry.findMany({
      orderBy: [{ transactionAt: "desc" }, { createdAt: "desc" }],
      take: 500,
      include: {
        profile: { select: { user: { select: { name: true } } } },
        account: { select: { server: true, loginHint: true, accountCurrency: true, user: { select: { name: true } } } },
        relationship: { select: { follower: { select: { name: true } } } },
        events: {
          orderBy: { createdAt: "desc" },
          take: 12,
          include: { admin: { select: { name: true } } },
        },
      },
    });
    const safeEntries = entries.map((entry) => Object.fromEntries(
      Object.entries(entry).filter(([key]) => key !== "sourceSubscriberId"),
    ));
    return NextResponse.json({ entries: safeEntries }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    console.error("COPY TRADING LEDGER GET ERROR:", error);
    return NextResponse.json({ error: "Unable to load the copy trading ledger." }, { status: 500 });
  }
}

async function syncHistory(body: { from?: unknown; till?: unknown }) {
  if (!LIVE_COPY_ENABLED) {
    return NextResponse.json({ error: "CopyFactory history sync is disabled until Mivo enables its paid live copy service." }, { status: 503 });
  }

  const now = new Date();
  const till = typeof body.till === "string" ? new Date(body.till) : now;
  const from = typeof body.from === "string" ? new Date(body.from) : new Date(till.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(till.getTime()) || from >= till) {
    return NextResponse.json({ error: "Choose a valid start and end date." }, { status: 400 });
  }
  if (till.getTime() - from.getTime() > 90 * 24 * 60 * 60 * 1000) {
    return NextResponse.json({ error: "Sync periods can be up to 90 days. Choose a shorter period and sync again." }, { status: 400 });
  }

  try {
    const profiles = await prisma.copyTraderProfile.findMany({
      where: { copyFactoryStrategyId: { not: null }, providerAccountId: { not: null } },
      select: { id: true, providerAccountId: true, providerRegion: true, copyFactoryStrategyId: true },
    });
    if (profiles.length === 0) return NextResponse.json({ synced: 0, updated: 0, skipped: 0, unmatched: 0, message: "No CopyFactory strategies are linked to provider profiles yet." });

    const regionalProfiles = new Map<string, typeof profiles>();
    let unresolvedProfiles = 0;
    for (const profile of profiles) {
      let region = profile.providerRegion;
      if (!region && profile.providerAccountId) {
        try {
          const { data: providerAccount } = await metaApiRequest<MetaApiAccount>(
            `/users/current/accounts/${encodeURIComponent(profile.providerAccountId)}`,
          );
          region = providerAccount?.region ?? null;
          if (region) await prisma.copyTraderProfile.update({ where: { id: profile.id }, data: { providerRegion: region } });
        } catch {
          unresolvedProfiles += 1;
          continue;
        }
      }
      if (!region || !profile.copyFactoryStrategyId) {
        unresolvedProfiles += 1;
        continue;
      }
      const group = regionalProfiles.get(region) ?? [];
      group.push(profile);
      regionalProfiles.set(region, group);
    }

    const usableProfiles = [...regionalProfiles.values()].flat();
    const relationships = await prisma.liveCopyRelationship.findMany({
      where: { profileId: { in: usableProfiles.map((profile) => profile.id) } },
      select: {
        id: true, profileId: true, strategyId: true, copierShareRateAtStart: true,
        mivoShareRateAtStart: true, profitSplitVersion: true,
        account: { select: { id: true, metaApiAccountId: true, accountCurrency: true } },
      },
    });
    const relationshipsBySubscriber = new Map(relationships.filter((relationship) => relationship.profitSplitVersion === 2).map((relationship) => [
      compositeKey(relationship.strategyId, relationship.account.metaApiAccountId), relationship,
    ]));
    const profilesByStrategy = new Map(usableProfiles.map((profile) => [profile.copyFactoryStrategyId!, profile]));

    let synced = 0;
    let updated = 0;
    let skipped = 0;
    let unmatched = 0;
    let pageLimitReached = false;
    let settledSourceChanged = 0;

    for (const [region, regional] of regionalProfiles) {
      const strategyIds = regional.map((profile) => profile.copyFactoryStrategyId).filter((id): id is string => Boolean(id));
      const maxPages = 50;
      let offset = 0;
      for (let page = 0; page < maxPages; page += 1) {
        const query = new URLSearchParams({
          from: from.toISOString(),
          till: till.toISOString(),
          strategyId: JSON.stringify(strategyIds),
          offset: String(offset),
          limit: "1000",
        });
        const path = `/users/current/provided-transactions?${query.toString()}`;
        const response = await copyFactoryRequest<CopyFactoryTransaction[]>(region, path);
        const transactions = Array.isArray(response) ? response : [];
        for (const transaction of transactions) {
          const strategyId = transaction.strategy?.id;
          const profile = strategyId ? profilesByStrategy.get(strategyId) : null;
          const transactionDate = typeof transaction.time === "string" ? new Date(transaction.time) : null;
          if (!profile || !strategyId || !transaction.id || !transaction.subscriberId || transaction.demo !== false
            || !transactionDate || !Number.isFinite(transactionDate.getTime())) {
            skipped += 1;
            continue;
          }
          const relationship = relationshipsBySubscriber.get(compositeKey(strategyId, transaction.subscriberId));
          if (!relationship) {
            unmatched += 1;
            continue;
          }
          const providerCommission = finiteAmount(transaction.providerCommission);
          const copyFactoryPlatformCommission = finiteAmount(transaction.platformCommission);
          const eligibleProfit = Math.max(0, finiteAmount(transaction.improvement));
          if (eligibleProfit <= 0) {
            skipped += 1;
            continue;
          }
          const split = calculateCopyTradingProfitSplit(relationship.copierShareRateAtStart, eligibleProfit);
          if (!split) {
            skipped += 1;
            continue;
          }

          const uniqueKey = {
            sourceTransactionId_sourceSubscriberId: {
              sourceTransactionId: transaction.id,
              sourceSubscriberId: transaction.subscriberId,
            },
          };
          const entryData = {
            sourceTransactionId: transaction.id,
            sourceSubscriberId: transaction.subscriberId,
            strategyId,
            profileId: profile.id,
            relationshipId: relationship.id,
            accountId: relationship.account.id,
            transactionAt: transactionDate,
            currency: relationship.account.accountCurrency,
            symbol: typeof transaction.symbol === "string" ? transaction.symbol.slice(0, 40) : null,
            positionId: typeof transaction.positionId === "string" ? transaction.positionId.slice(0, 100) : null,
            profit: finiteAmount(transaction.profit),
            improvement: finiteAmount(transaction.improvement),
            eligibleProfit,
            copierProfitShareRate: relationship.copierShareRateAtStart,
            mivoProfitShareRate: relationship.mivoShareRateAtStart || MIVO_PROFIT_SHARE_RATE,
            copierShareAmount: split.copierShare,
            providerShareAmount: split.providerShare,
            providerCommission,
            mivoShareAmount: split.mivoShare,
            copyFactoryPlatformCommission,
          };

          try {
            const result = await prisma.$transaction(async (tx) => {
              const existing = await tx.copyTradingLedgerEntry.findUnique({
                where: uniqueKey,
                select: { id: true, eligibleProfit: true, copierProfitShareRate: true, copierShareAmount: true, providerShareAmount: true, providerCommission: true, mivoShareAmount: true, copyFactoryPlatformCommission: true, events: { select: { id: true }, take: 1 } },
              });
              if (!existing) {
                await tx.copyTradingLedgerEntry.create({ data: entryData });
                return "created" as const;
              }
              const changed = Math.abs(existing.providerCommission - providerCommission) > 0.000001
                || Math.abs(existing.eligibleProfit - eligibleProfit) > 0.000001
                || Math.abs(existing.copierProfitShareRate - relationship.copierShareRateAtStart) > 0.000001
                || Math.abs(existing.copierShareAmount - split.copierShare) > 0.000001
                || Math.abs(existing.providerShareAmount - split.providerShare) > 0.000001
                || Math.abs(existing.mivoShareAmount - split.mivoShare) > 0.000001
                || Math.abs(existing.copyFactoryPlatformCommission - copyFactoryPlatformCommission) > 0.000001;
              if (existing.events.length > 0) {
                return changed ? "settled_changed" as const : "same" as const;
              }
              if (!changed) return "same" as const;
              await tx.copyTradingLedgerEntry.update({ where: { id: existing.id }, data: entryData });
              return "updated" as const;
            }, { isolationLevel: "Serializable" });
            if (result === "created") synced += 1;
            else if (result === "updated") updated += 1;
            else if (result === "settled_changed") settledSourceChanged += 1;
          } catch (error) {
            if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
              skipped += 1;
              continue;
            }
            throw error;
          }
        }

        if (transactions.length < 1000) break;
        offset += transactions.length;
        if (page === maxPages - 1) pageLimitReached = true;
      }
    }

    return NextResponse.json({
      synced, updated, skipped, unmatched, unresolvedProfiles, settledSourceChanged, pageLimitReached,
      message: "Commission history was synced from CopyFactory. This only updates Mivo’s internal ledger; it does not collect money or send payouts.",
    });
  } catch (error) {
    if (error instanceof MetaApiError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("COPY TRADING LEDGER SYNC ERROR:", error);
    return NextResponse.json({ error: "Unable to sync CopyFactory commission history." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const adminId = await getAdminId();
  if (!adminId) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  let body: { action?: unknown; id?: unknown; reference?: unknown; from?: unknown; till?: unknown };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid ledger action." }, { status: 400 }); }
  if (body.action === "sync") return syncHistory(body);

  const rawAction = body.action;
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const reference = typeof body.reference === "string" ? body.reference.trim().slice(0, 200) : "";
  const validActions: LedgerAction[] = ["record_collection", "record_provider_payout", "record_mivo_receipt"];
  if (!id || typeof rawAction !== "string" || !validActions.includes(rawAction as LedgerAction)) {
    return NextResponse.json({ error: "Choose a ledger entry and a valid settlement action." }, { status: 400 });
  }
  const action = rawAction as LedgerAction;
  if (reference.length < 3) return NextResponse.json({ error: "Enter a payment or accounting reference of at least three characters." }, { status: 400 });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const entry = await tx.copyTradingLedgerEntry.findUnique({ where: { id } });
      if (!entry) return { error: "Ledger entry not found.", status: 404 } as const;
      if (action !== "record_collection" && entry.collectionStatus !== "RECORDED") {
        return { error: "Record the copier fee collection before recording provider or Mivo settlement.", status: 409 } as const;
      }

      const amount = action === "record_collection"
        ? entry.providerShareAmount + entry.mivoShareAmount
        : action === "record_provider_payout" ? entry.providerShareAmount : entry.mivoShareAmount;
      if (!Number.isFinite(amount) || amount <= 0) {
        return { error: "This CopyFactory entry has no positive amount for that settlement action." , status: 409 } as const;
      }

      const statusField = action === "record_collection" ? "collectionStatus"
        : action === "record_provider_payout" ? "providerPayoutStatus" : "mivoReceiptStatus";
      if (entry[statusField] === "RECORDED") {
        return { error: "That settlement has already been recorded for this entry.", status: 409 } as const;
      }
      const now = new Date();
      const update = action === "record_collection" ? {
        collectionStatus: "RECORDED", collectedAt: now, collectionReference: reference,
      } : action === "record_provider_payout" ? {
        providerPayoutStatus: "RECORDED", providerPaidAt: now, providerPayoutReference: reference,
      } : {
        mivoReceiptStatus: "RECORDED", mivoReceivedAt: now, mivoReceiptReference: reference,
      };

      await tx.copyTradingLedgerEntry.update({ where: { id }, data: update });
      await tx.copyTradingLedgerEvent.create({ data: {
        entryId: id,
        adminId,
        action: action.toUpperCase(),
        amount,
        currency: entry.currency,
        reference,
      } });
      return { success: true, amount, currency: entry.currency } as const;
    });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result);
  } catch (error) {
    console.error("COPY TRADING LEDGER ACTION ERROR:", error);
    return NextResponse.json({ error: "Unable to record this ledger settlement." }, { status: 500 });
  }
}
