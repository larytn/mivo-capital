"use client";

type Snapshot = {
  id: string;
  balance: number;
  equity: number;
  recordedAt: string;
};

type Trade = {
  id: string;
  ticket: string;
  symbol: string;
  type: string | null;
  volume: number;
  openPrice: number | null;
  closePrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  openedAt: string;
  closedAt: string | null;
  commission: number;
  swap: number;
  profit: number;
};

function money(value: number) {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function AccountAnalytics({
  snapshots,
  trades,
  startingBalance,
}: {
  snapshots: Snapshot[];
  trades: Trade[];
  startingBalance: number;
}) {
  const closedTrades = trades.filter(
    (trade) => trade.closedAt
  );

  const wins = closedTrades.filter(
    (trade) => trade.profit > 0
  );

  const losses = closedTrades.filter(
    (trade) => trade.profit < 0
  );

  const winRate =
    closedTrades.length > 0
      ? (wins.length / closedTrades.length) * 100
      : 0;

  const grossProfit = wins.reduce(
    (sum, trade) => sum + trade.profit,
    0
  );

  const grossLoss = Math.abs(
    losses.reduce(
      (sum, trade) => sum + trade.profit,
      0
    )
  );

  const profitFactor =
    grossLoss > 0
      ? grossProfit / grossLoss
      : grossProfit > 0
        ? grossProfit
        : 0;

  const bestTrade =
    closedTrades.length > 0
      ? Math.max(
          ...closedTrades.map(
            (trade) => trade.profit
          )
        )
      : 0;

  const worstTrade =
    closedTrades.length > 0
      ? Math.min(
          ...closedTrades.map(
            (trade) => trade.profit
          )
        )
      : 0;

  const chartData =
    snapshots.length > 0
      ? snapshots
      : [
          {
            id: "start",
            balance: startingBalance,
            equity: startingBalance,
            recordedAt:
              new Date().toISOString(),
          },
        ];

  const values = chartData.flatMap(
    (item) => [
      item.balance,
      item.equity,
    ]
  );

  const minimum =
    Math.min(...values) * 0.995;

  const maximum =
    Math.max(...values) * 1.005;

  const range =
    maximum - minimum || 1;

  function points(
    key: "balance" | "equity"
  ) {
    if (chartData.length === 1) {
      const value =
        chartData[0][key];

      const y =
        100 -
        ((value - minimum) / range) *
          100;

      return `0,${y} 100,${y}`;
    }

    return chartData
      .map((item, index) => {
        const x =
          (index /
            (chartData.length - 1)) *
          100;

        const y =
          100 -
          ((item[key] - minimum) /
            range) *
            100;

        return `${x},${y}`;
      })
      .join(" ");
  }

  const dailyResults =
    closedTrades.reduce<
      Record<string, number>
    >((results, trade) => {
      const date = new Date(
        trade.closedAt!
      ).toLocaleDateString(
        "en-US",
        {
          year: "numeric",
          month: "short",
          day: "numeric",
        }
      );

      results[date] =
        (results[date] ?? 0) +
        trade.profit;

      return results;
    }, {});

  return (
    <div className="mt-10 space-y-10">
      {/* PERFORMANCE CHART */}

      <section>
        <div className="mb-5">
          <h2 className="text-2xl font-bold">
            Account Performance
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Balance and equity movement
            for this trading account.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="mb-5 flex flex-wrap gap-5 text-sm">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
              Balance
            </div>

            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              Equity
            </div>
          </div>

          <div className="h-72 w-full overflow-hidden">
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="h-full w-full"
            >
              {[20, 40, 60, 80].map(
                (y) => (
                  <line
                    key={y}
                    x1="0"
                    x2="100"
                    y1={y}
                    y2={y}
                    stroke="rgb(63 63 70)"
                    strokeWidth="0.3"
                  />
                )
              )}

              <polyline
                points={points(
                  "balance"
                )}
                fill="none"
                stroke="rgb(34 197 94)"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />

              <polyline
                points={points(
                  "equity"
                )}
                fill="none"
                stroke="rgb(59 130 246)"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>

          {snapshots.length === 0 && (
            <p className="mt-4 text-center text-sm text-gray-500">
              Performance history will
              appear automatically as
              account data is synchronized.
            </p>
          )}
        </div>
      </section>

      {/* STATISTICS */}

      <section>
        <h2 className="mb-5 text-2xl font-bold">
          Trading Statistics
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Total Trades"
            value={String(
              closedTrades.length
            )}
          />

          <Metric
            label="Win Rate"
            value={`${winRate.toFixed(
              1
            )}%`}
          />

          <Metric
            label="Wins"
            value={String(wins.length)}
            className="text-green-400"
          />

          <Metric
            label="Losses"
            value={String(
              losses.length
            )}
            className="text-red-400"
          />

          <Metric
            label="Profit Factor"
            value={profitFactor.toFixed(
              2
            )}
          />

          <Metric
            label="Best Trade"
            value={money(bestTrade)}
            className="text-green-400"
          />

          <Metric
            label="Worst Trade"
            value={money(worstTrade)}
            className={
              worstTrade < 0
                ? "text-red-400"
                : ""
            }
          />

          <Metric
            label="Gross Profit"
            value={money(grossProfit)}
            className="text-green-400"
          />
        </div>
      </section>

      {/* TRADING CALENDAR */}

      <section>
        <div className="mb-5">
          <h2 className="text-2xl font-bold">
            Trading Calendar
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Daily realized trading
            results.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          {Object.keys(
            dailyResults
          ).length === 0 ? (
            <p className="text-sm text-gray-500">
              No closed trading days yet.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {Object.entries(
                dailyResults
              ).map(
                ([date, result]) => (
                  <div
                    key={date}
                    className="rounded-lg border border-zinc-800 bg-black p-4"
                  >
                    <p className="text-xs text-gray-500">
                      {date}
                    </p>

                    <p
                      className={`mt-2 text-lg font-bold ${
                        result >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {result >= 0
                        ? "+"
                        : ""}
                      {money(result)}
                    </p>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </section>

      {/* TRADE JOURNAL */}

      <section>
        <div className="mb-5">
          <h2 className="text-2xl font-bold">
            Trade Journal
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Trades synchronized
            automatically from the
            trading account.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
          {trades.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No trades recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="border-b border-zinc-800 bg-zinc-950 text-gray-400">
                  <tr>
                    <th className="p-4">
                      Date
                    </th>
                    <th className="p-4">
                      Ticket
                    </th>
                    <th className="p-4">
                      Symbol
                    </th>
                    <th className="p-4">
                      Type
                    </th>
                    <th className="p-4">
                      Lots
                    </th>
                    <th className="p-4">
                      Entry
                    </th>
                    <th className="p-4">
                      Exit
                    </th>
                    <th className="p-4">
                      SL
                    </th>
                    <th className="p-4">
                      TP
                    </th>
                    <th className="p-4">
                      Commission
                    </th>
                    <th className="p-4">
                      Swap
                    </th>
                    <th className="p-4">
                      P/L
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {trades.map(
                    (trade) => (
                      <tr
                        key={trade.id}
                        className="border-b border-zinc-800/70"
                      >
                        <td className="whitespace-nowrap p-4">
                          {new Date(
                            trade.openedAt
                          ).toLocaleString()}
                        </td>

                        <td className="p-4">
                          {trade.ticket}
                        </td>

                        <td className="p-4 font-semibold">
                          {trade.symbol}
                        </td>

                        <td className="p-4">
                          <span
                            className={
                              trade.type
                                ?.toUpperCase()
                                .includes(
                                  "BUY"
                                )
                                ? "text-green-400"
                                : "text-red-400"
                            }
                          >
                            {trade.type ??
                              "—"}
                          </span>
                        </td>

                        <td className="p-4">
                          {trade.volume}
                        </td>

                        <td className="p-4">
                          {trade.openPrice ??
                            "—"}
                        </td>

                        <td className="p-4">
                          {trade.closePrice ??
                            "—"}
                        </td>

                        <td className="p-4">
                          {trade.stopLoss ??
                            "—"}
                        </td>

                        <td className="p-4">
                          {trade.takeProfit ??
                            "—"}
                        </td>

                        <td className="p-4">
                          {money(
                            trade.commission
                          )}
                        </td>

                        <td className="p-4">
                          {money(
                            trade.swap
                          )}
                        </td>

                        <td
                          className={`p-4 font-bold ${
                            trade.profit >
                            0
                              ? "text-green-400"
                              : trade.profit <
                                  0
                                ? "text-red-400"
                                : ""
                          }`}
                        >
                          {trade.profit >
                          0
                            ? "+"
                            : ""}
                          {money(
                            trade.profit
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-sm text-gray-500">
        {label}
      </p>

      <p
        className={`mt-2 text-2xl font-bold ${className}`}
      >
        {value}
      </p>
    </div>
  );
}