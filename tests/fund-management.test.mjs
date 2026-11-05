import assert from "node:assert/strict";
import test from "node:test";
import { calculateFundPeriod } from "../lib/fund-management-accounting.ts";

test("fee calculation excludes unrealised gains and deducts costs and approved expenses", () => {
  const result = calculateFundPeriod({
    previousHighWaterMark: "0", previousLossCarryForward: "0",
    verifiedRealizedPnl: "120.50", unrealizedPnl: "900", tradingCosts: "5.25",
    approvedExpenses: ["10.25"], mivoShareRate: "0.1", statementVerified: true,
  });
  assert.equal(result.netRealizedProfit, "105");
  assert.equal(result.eligibleProfit, "105");
  assert.equal(result.unrealizedPnl, "900");
  assert.equal(result.mivoShareAmount, "10.5");
  assert.equal(result.investorShareAmount, "94.5");
});

test("losses carry forward and recovery cannot trigger a performance fee", () => {
  const loss = calculateFundPeriod({
    previousHighWaterMark: "100", previousLossCarryForward: "0",
    verifiedRealizedPnl: "-40", approvedExpenses: [], mivoShareRate: "0.1", statementVerified: true,
  });
  assert.equal(loss.eligibleProfit, "0");
  assert.equal(loss.highWaterMarkAfter, "100");
  assert.equal(loss.lossCarryForwardAfter, "40");

  const partialRecovery = calculateFundPeriod({
    previousHighWaterMark: loss.highWaterMarkAfter, previousLossCarryForward: loss.lossCarryForwardAfter,
    verifiedRealizedPnl: "25", approvedExpenses: [], mivoShareRate: "0.1", statementVerified: true,
  });
  assert.equal(partialRecovery.eligibleProfit, "0");
  assert.equal(partialRecovery.lossCarryForwardAfter, "15");

  const aboveRecovery = calculateFundPeriod({
    previousHighWaterMark: partialRecovery.highWaterMarkAfter, previousLossCarryForward: partialRecovery.lossCarryForwardAfter,
    verifiedRealizedPnl: "20", approvedExpenses: [], mivoShareRate: "0.1", statementVerified: true,
  });
  assert.equal(aboveRecovery.eligibleProfit, "5");
  assert.equal(aboveRecovery.highWaterMarkAfter, "105");
  assert.equal(aboveRecovery.lossCarryForwardAfter, "0");
  assert.equal(aboveRecovery.mivoShareAmount, "0.5");
});

test("unverified statements and invalid fee inputs cannot produce a calculation", () => {
  const base = { previousHighWaterMark: 0, previousLossCarryForward: 0, verifiedRealizedPnl: 10, approvedExpenses: [], mivoShareRate: 0.1, statementVerified: true };
  assert.throws(() => calculateFundPeriod({ ...base, statementVerified: false }), /verified statements/);
  assert.throws(() => calculateFundPeriod({ ...base, approvedExpenses: [-1] }), /non-negative/);
  assert.throws(() => calculateFundPeriod({ ...base, mivoShareRate: 1.01 }), /between 0% and 100%/);
  assert.throws(() => calculateFundPeriod({ ...base, tradingCosts: -1 }), /trading costs/);
});
