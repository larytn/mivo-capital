type PerformanceTrade = {
  source: string;
  status: string;
  pnl: number;
  fees: number;
  symbol: string;
  direction: string;
  entryPrice: number;
  exitPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  currentPrice: number | null;
  openedAt: Date;
  closedAt: Date | null;
};

export function providerPerformance(
  trades: PerformanceTrade[],
  connection: { status: string; lastSyncedAt: Date | null } | null,
) {
  const brokerTrades = trades
    .filter((trade) => trade.source === "MT5" && trade.status === "CLOSED" && trade.closedAt)
    .sort((a, b) => a.closedAt!.getTime() - b.closedAt!.getTime());
  const results = brokerTrades.map((trade) => trade.pnl - trade.fees);
  const gains = results.reduce((sum, value) => sum + Math.max(0, value), 0);
  const losses = results.reduce((sum, value) => sum + Math.max(0, -value), 0);
  let running = 0;
  let peak = 0;
  let maxDrawdown = 0;
  const curve = [{ date: "", value: 0 }];
  for (let index = 0; index < brokerTrades.length; index++) {
    running += results[index];
    peak = Math.max(peak, running);
    maxDrawdown = Math.max(maxDrawdown, peak - running);
    curve.push({ date: brokerTrades[index].closedAt!.toISOString(), value: running });
  }

  const brokerConnected = connection?.status === "CONNECTED";
  const verified = Boolean(brokerConnected && brokerTrades.length > 0);
  return {
    verified,
    sourceLabel: verified ? "MT5-synced history" : "No verified broker history",
    netPnl: verified ? results.reduce((sum, value) => sum + value, 0) : null,
    maxDrawdown: verified ? maxDrawdown : null,
    winRate: verified ? (results.filter((value) => value > 0).length / results.length) * 100 : null,
    profitFactor: verified ? (losses === 0 ? (gains > 0 ? null : 0) : gains / losses) : null,
    profitFactorInfinite: Boolean(verified && losses === 0 && gains > 0),
    totalTrades: verified ? brokerTrades.length : null,
    curve: verified ? curve : [],
    lastSyncedAt: connection?.lastSyncedAt?.toISOString() ?? null,
  };
}

export type ProviderMetrics = ReturnType<typeof providerPerformance>;
