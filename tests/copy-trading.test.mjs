import assert from "node:assert/strict";
import test from "node:test";
import { calculateCopyTradingProfitSplit, copyFactoryCommissionSettings } from "../lib/copy-trading-fees.ts";
import { providerPerformance } from "../lib/copy-trading-stats.ts";

test("Mivo receives 10% of eligible profit before the provider and copier split the remaining 90%", () => {
  assert.deepEqual(calculateCopyTradingProfitSplit(0.3, 100), {
    eligibleProfit: 100,
    mivoShare: 10,
    copierShare: 30,
    providerShare: 60,
    totalCollected: 70,
  });
  assert.deepEqual(calculateCopyTradingProfitSplit(0.4, 100), {
    eligibleProfit: 100,
    mivoShare: 10,
    copierShare: 40,
    providerShare: 50,
    totalCollected: 60,
  });
});

test("CopyFactory commission settings leave the provider and Mivo their intended gross-profit shares", () => {
  assert.deepEqual(copyFactoryCommissionSettings(0.3), {
    commissionRate: 0.7,
    platformCommissionRate: 0.1 / 0.7,
  });
});

test("copy trading profit split rejects out of range rates and invalid profit", () => {
  assert.equal(calculateCopyTradingProfitSplit(-0.01, 100), null);
  assert.equal(calculateCopyTradingProfitSplit(0.91, 100), null);
  assert.equal(calculateCopyTradingProfitSplit(0.35, -1), null);
});

const history = [
  { source: "MT5", status: "CLOSED", pnl: 110, fees: 10, symbol: "EURUSD", direction: "BUY", entryPrice: 1, exitPrice: 2, stopLoss: null, takeProfit: null, currentPrice: 2, openedAt: new Date("2026-01-01"), closedAt: new Date("2026-01-02") },
  { source: "MT5", status: "CLOSED", pnl: -55, fees: 5, symbol: "EURUSD", direction: "SELL", entryPrice: 2, exitPrice: 3, stopLoss: null, takeProfit: null, currentPrice: 3, openedAt: new Date("2026-01-03"), closedAt: new Date("2026-01-04") },
  { source: "MT5", status: "CLOSED", pnl: 35, fees: 5, symbol: "XAUUSD", direction: "BUY", entryPrice: 3, exitPrice: 4, stopLoss: null, takeProfit: null, currentPrice: 4, openedAt: new Date("2026-01-05"), closedAt: new Date("2026-01-06") },
  { source: "MANUAL", status: "CLOSED", pnl: 10000, fees: 0, symbol: "BTCUSD", direction: "BUY", entryPrice: 3, exitPrice: 4, stopLoss: null, takeProfit: null, currentPrice: 4, openedAt: new Date("2026-01-07"), closedAt: new Date("2026-01-08") },
];

test("verified performance uses synced closed history and excludes manual claims", () => {
  const performance = providerPerformance(history, { status: "CONNECTED", lastSyncedAt: new Date("2026-01-09") });
  assert.equal(performance.verified, true);
  assert.equal(performance.totalTrades, 3);
  assert.equal(performance.netPnl, 70);
  assert.equal(performance.maxDrawdown, 60);
  assert.ok(Math.abs(performance.winRate - 200 / 3) < 1e-10);
  assert.ok(Math.abs(performance.profitFactor - 130 / 60) < 1e-10);
});

test("unconnected broker history is not displayed as verified", () => {
  const performance = providerPerformance(history, { status: "DISCONNECTED", lastSyncedAt: null });
  assert.equal(performance.verified, false);
  assert.equal(performance.netPnl, null);
  assert.deepEqual(performance.curve, []);
});
