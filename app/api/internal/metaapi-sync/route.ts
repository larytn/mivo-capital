import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMetaApi } from "@/lib/metaapi";

export const runtime = "nodejs";

type MetaApiDeal = {
  id?: string | number;
  orderId?: string | number;
  positionId?: string | number;

  symbol?: string;
  type?: string;
  entryType?: string;

  volume?: number;
  price?: number;

  profit?: number;
  commission?: number;
  swap?: number;

  time?: Date | string;
  brokerTime?: string;
};
const metaApi = getMetaApi();
function numberValue(
  value: unknown,
  fallback = 0
) {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function dealDate(
  value: Date | string | undefined
) {
  if (!value) {
    return null;
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
}

export async function POST(
  request: NextRequest
) {
  try {
    /*
     * SECURITY
     */

    const apiKey =
      request.headers.get(
        "x-mivo-api-key"
      );

    if (
      !process.env.TRADING_SYNC_API_KEY ||
      apiKey !==
        process.env.TRADING_SYNC_API_KEY
    ) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * FIND LINKED MIVO ACCOUNTS
     */

    const challenges =
      await prisma.challenge.findMany({
        where: {
          metaApiAccountId: {
            not: null,
          },

          mt5Login: {
            not: null,
          },

          status: {
            in: [
              "ACTIVE",
              "PASSED",
            ],
          },
        },

        select: {
          id: true,
          mt5Login: true,
          metaApiAccountId: true,

          startingBalance: true,
          assignedAt: true,
        },
      });

    const results: any[] = [];

    /*
     * SYNC EACH ACCOUNT
     */

    for (
      const challenge of challenges
    ) {
      try {
        if (
          !challenge.metaApiAccountId ||
          !challenge.mt5Login
        ) {
          continue;
        }

        /*
         * METAAPI ACCOUNT
         */

        const account =
          await metaApi
            .metatraderAccountApi
            .getAccount(
              challenge.metaApiAccountId
            );

        if (
          account.state !==
          "DEPLOYED"
        ) {
          await account.deploy();
        }

        await account.waitConnected();

        /*
         * RPC CONNECTION
         */

        const connection =
          account.getRPCConnection();

        await connection.connect();

        await connection
          .waitSynchronized();

        /*
         * LIVE ACCOUNT INFO
         */

        const information =
          await connection
            .getAccountInformation();

        const metaApiBalance =
          numberValue(
            information.balance
          );

        const metaApiEquity =
          numberValue(
            information.equity
          );

        /*
         * HISTORY RANGE
         *
         * Start from account assignment
         * where possible.
         */

        const historyEnd =
          new Date();

        const historyStart =
          challenge.assignedAt
            ? new Date(
                challenge.assignedAt
              )
            : new Date(
                historyEnd.getTime() -
                  30 *
                    24 *
                    60 *
                    60 *
                    1000
              );

        const history =
          await connection
            .getDealsByTimeRange(
              historyStart,
              historyEnd
            );

        const deals: MetaApiDeal[] =
          history?.deals ?? [];

        /*
         * BALANCE OPERATIONS
         *
         * These are deposits / credits /
         * balance adjustments.
         *
         * They are NOT trading positions.
         */

        const balanceDeals =
          deals.filter(
            (deal) =>
              deal.type ===
              "DEAL_TYPE_BALANCE"
          );

        const balanceOperations =
          balanceDeals.reduce(
            (total, deal) =>
              total +
              numberValue(
                deal.profit
              ),
            0
          );

        /*
         * TRADING DEALS ONLY
         */

        const tradingDeals =
          deals.filter(
            (deal) =>
              deal.symbol &&
              deal.positionId &&
              deal.type !==
                "DEAL_TYPE_BALANCE"
          );

        /*
         * GROUP DEALS BY POSITION ID
         *
         * MetaApi gives us separate
         * entry and exit deals.
         */

        const positions =
          new Map<
            string,
            MetaApiDeal[]
          >();

        for (
          const deal of tradingDeals
        ) {
          const positionId =
            String(
              deal.positionId
            );

          const existing =
            positions.get(
              positionId
            ) ?? [];

          existing.push(deal);

          positions.set(
            positionId,
            existing
          );
        }

        /*
         * BUILD MIVO TRADES
         */

        const trades: any[] = [];

        for (
          const [
            positionId,
            positionDeals,
          ] of positions
        ) {
          const sorted =
            [...positionDeals].sort(
              (a, b) => {
                const aTime =
                  dealDate(
                    a.time
                  )?.getTime() ??
                  0;

                const bTime =
                  dealDate(
                    b.time
                  )?.getTime() ??
                  0;

                return (
                  aTime -
                  bTime
                );
              }
            );

          /*
           * ENTRY DEAL
           */

          const entry =
            sorted.find(
              (deal) =>
                deal.entryType ===
                "DEAL_ENTRY_IN"
            );

          /*
           * EXIT DEAL
           */

          const exit =
            [...sorted]
              .reverse()
              .find(
                (deal) =>
                  deal.entryType ===
                  "DEAL_ENTRY_OUT"
              );

          /*
           * Only save completed trades
           * for now.
           */

          if (
            !entry ||
            !exit
          ) {
            continue;
          }

          const openedAt =
            dealDate(
              entry.time
            );

          const closedAt =
            dealDate(
              exit.time
            );

          if (
            !openedAt ||
            !closedAt
          ) {
            continue;
          }

          /*
           * PROFIT
           *
           * Include all position deals
           * because commission/swap can
           * sometimes appear separately.
           */

          const positionProfit =
            sorted.reduce(
              (total, deal) =>
                total +
                numberValue(
                  deal.profit
                ),
              0
            );

          const commission =
            sorted.reduce(
              (total, deal) =>
                total +
                numberValue(
                  deal.commission
                ),
              0
            );

          const swap =
            sorted.reduce(
              (total, deal) =>
                total +
                numberValue(
                  deal.swap
                ),
              0
            );

          /*
           * TRADE DIRECTION
           *
           * Use the entry deal.
           */

          let tradeType:
            | string
            | null = null;

          if (
            entry.type ===
            "DEAL_TYPE_BUY"
          ) {
            tradeType = "BUY";
          } else if (
            entry.type ===
            "DEAL_TYPE_SELL"
          ) {
            tradeType = "SELL";
          }

          trades.push({
            ticket:
              positionId,

            symbol:
              entry.symbol ??
              exit.symbol ??
              "UNKNOWN",

            type:
              tradeType,

            volume:
              numberValue(
                entry.volume
              ),

            openPrice:
              entry.price != null
                ? numberValue(
                    entry.price
                  )
                : null,

            closePrice:
              exit.price != null
                ? numberValue(
                    exit.price
                  )
                : null,

            stopLoss: null,
            takeProfit: null,

            openedAt:
              openedAt.toISOString(),

            closedAt:
              closedAt.toISOString(),

            commission,

            swap,

            profit:
              positionProfit,
          });
        }

        /*
         * CLOSED TRADING RESULT
         */

        const closedTradingProfit =
          trades.reduce(
            (total, trade) =>
              total +
              numberValue(
                trade.profit
              ) +
              numberValue(
                trade.commission
              ) +
              numberValue(
                trade.swap
              ),
            0
          );

        /*
         * CORRECT BALANCE
         *
         * MetaApi returned -92.40 for the
         * test account even though history
         * showed:
         *
         * +10000 balance operation
         * -92.40 trading result
         *
         * Therefore reconstruct balance
         * from broker history when MetaApi's
         * reported balance is clearly not
         * the actual account balance.
         */

        let currentBalance =
          metaApiBalance;

        const reconstructedBalance =
          balanceOperations +
          closedTradingProfit;

        if (
          balanceOperations > 0 &&
          (
            metaApiBalance <= 0 ||
            Math.abs(
              metaApiBalance -
                reconstructedBalance
            ) >
              Math.max(
                1,
                Math.abs(
                  reconstructedBalance
                ) * 0.5
              )
          )
        ) {
          currentBalance =
            reconstructedBalance;
        }

        /*
         * EQUITY
         *
         * If MetaApi's balance was clearly
         * malformed and there are no open
         * positions represented here,
         * use the reconstructed balance.
         *
         * Otherwise preserve MetaApi equity.
         */

        let currentEquity =
          metaApiEquity;

        if (
          metaApiBalance <= 0 &&
          balanceOperations > 0 &&
          metaApiEquity <= 0
        ) {
          currentEquity =
            currentBalance;
        }

        /*
         * EMPTY ACCOUNT PROTECTION
         */

        if (
          currentBalance === 0 &&
          currentEquity === 0 &&
          balanceOperations === 0
        ) {
          results.push({
            challengeId:
              challenge.id,

            mt5Login:
              challenge.mt5Login,

            success: false,

            skipped: true,

            error:
              "MT5 account has no balance yet.",
          });

          continue;
        }

        /*
         * SEND TO EXISTING
         * MIVO TRADING ENGINE
         */

        const syncUrl =
          new URL(
            "/api/internal/trading-sync",
            request.nextUrl.origin
          );

        const syncResponse =
          await fetch(
            syncUrl,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                "x-mivo-api-key":
                  process.env
                    .TRADING_SYNC_API_KEY!,
              },

              body:
                JSON.stringify({
                  mt5Login:
                    challenge.mt5Login,

                  currentBalance,

                  currentEquity,

                  trades,
                }),
            }
          );

        const syncResult =
          await syncResponse.json();

        if (
          !syncResponse.ok
        ) {
          throw new Error(
            syncResult.error ||
              "Mivo trading engine rejected synchronization."
          );
        }

        /*
         * SUCCESS
         */

        results.push({
          challengeId:
            challenge.id,

          mt5Login:
            challenge.mt5Login,

          success: true,

          metaApiBalance,
          metaApiEquity,

          balanceOperations,

          closedTradingProfit,

          currentBalance,
          currentEquity,

          dealsReceived:
            deals.length,

          tradesCreated:
            trades.length,

          progression:
            syncResult.progression ??
            null,

          tradingDays:
            syncResult.tradingDays ??
            syncResult.account
              ?.tradingDays ??
            null,

          account:
            syncResult.account ??
            null,
        });
      } catch (error: any) {
        console.error(
          `METAAPI ACCOUNT SYNC ERROR (${challenge.id}):`,
          error
        );

        results.push({
          challengeId:
            challenge.id,

          mt5Login:
            challenge.mt5Login,

          success: false,

          error:
            error.message ||
            "Account synchronization failed.",
        });
      }
    }

    /*
     * SUMMARY
     */

    const synced =
      results.filter(
        (result) =>
          result.success
      ).length;

    const skipped =
      results.filter(
        (result) =>
          result.skipped
      ).length;

    const failed =
      results.filter(
        (result) =>
          !result.success &&
          !result.skipped
      ).length;

    return NextResponse.json({
      success: true,

      accountsChecked:
        challenges.length,

      synced,
      skipped,
      failed,

      results,
    });
  } catch (error: any) {
    console.error(
      "METAAPI SYNC ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "MetaApi synchronization failed.",
      },
      {
        status: 500,
      }
    );
  }
}