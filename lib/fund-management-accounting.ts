const SCALE_DIGITS = 10;
const SCALE = BigInt(10) ** BigInt(SCALE_DIGITS);

export type FundPeriodCalculationInput = {
  previousHighWaterMark: number | string;
  previousLossCarryForward: number | string;
  verifiedRealizedPnl: number | string;
  unrealizedPnl?: number | string;
  tradingCosts?: number | string;
  approvedExpenses: Array<number | string>;
  mivoShareRate: number | string;
  statementVerified: boolean;
};

export type FundPeriodCalculation = {
  approvedExpenses: string;
  tradingCosts: string;
  netRealizedProfit: string;
  eligibleProfit: string;
  highWaterMarkBefore: string;
  highWaterMarkAfter: string;
  lossCarryForwardBefore: string;
  lossCarryForwardAfter: string;
  mivoShareAmount: string;
  investorShareAmount: string;
  unrealizedPnl: string;
};

function scaled(value: number | string, label: string): bigint {
  const raw = String(value).trim();
  const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(raw);
  if (!match || (match[3]?.length ?? 0) > SCALE_DIGITS) {
    throw new Error(`${label} must be a finite decimal with at most ${SCALE_DIGITS} decimal places.`);
  }
  const fraction = (match[3] ?? "").padEnd(SCALE_DIGITS, "0");
  const valueScaled = BigInt(match[2]) * SCALE + BigInt(fraction || "0");
  return match[1] === "-" ? BigInt(0) - valueScaled : valueScaled;
}

function decimal(value: bigint): string {
  const negative = value < BigInt(0);
  const absolute = negative ? BigInt(0) - value : value;
  const whole = absolute / SCALE;
  const fractional = (absolute % SCALE).toString().padStart(SCALE_DIGITS, "0").replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${fractional ? `.${fractional}` : ""}`;
}

export function calculateFundPeriod(input: FundPeriodCalculationInput): FundPeriodCalculation {
  if (!input.statementVerified) throw new Error("Only verified statements can be used for fund performance fees.");
  const previousHighWaterMark = scaled(input.previousHighWaterMark, "High-water mark");
  const previousLossCarryForward = scaled(input.previousLossCarryForward, "Loss carry-forward");
  const realizedPnl = scaled(input.verifiedRealizedPnl, "Realised P&L");
  const unrealizedPnl = scaled(input.unrealizedPnl ?? 0, "Unrealised P&L");
  const tradingCosts = scaled(input.tradingCosts ?? 0, "Trading costs");
  const mivoShareRate = scaled(input.mivoShareRate, "Mivo share");
  if (previousHighWaterMark < BigInt(0) || previousLossCarryForward < BigInt(0)) {
    throw new Error("High-water mark and loss carry-forward must be non-negative.");
  }
  if (tradingCosts < BigInt(0)) throw new Error("Verified trading costs must be non-negative.");
  if (mivoShareRate < BigInt(0) || mivoShareRate > SCALE) throw new Error("Mivo's agreed share must be between 0% and 100%.");
  if (!Array.isArray(input.approvedExpenses)) throw new Error("Only approved non-negative expense amounts can be included.");
  const expenseAmounts = input.approvedExpenses.map((amount) => scaled(amount, "Approved expense"));
  if (expenseAmounts.some((amount) => amount < BigInt(0))) throw new Error("Only approved non-negative expense amounts can be included.");

  const approvedExpenses = expenseAmounts.reduce((sum, amount) => sum + amount, BigInt(0));
  const netRealizedProfit = realizedPnl - tradingCosts - approvedExpenses;
  const eligibleProfit = netRealizedProfit > previousLossCarryForward ? netRealizedProfit - previousLossCarryForward : BigInt(0);
  const lossCarryForwardAfter = netRealizedProfit < BigInt(0)
    ? previousLossCarryForward - netRealizedProfit
    : previousLossCarryForward > netRealizedProfit ? previousLossCarryForward - netRealizedProfit : BigInt(0);
  const highWaterMarkAfter = previousHighWaterMark + eligibleProfit;
  const mivoShareAmount = eligibleProfit * mivoShareRate / SCALE;

  return {
    approvedExpenses: decimal(approvedExpenses),
    tradingCosts: decimal(tradingCosts),
    netRealizedProfit: decimal(netRealizedProfit),
    eligibleProfit: decimal(eligibleProfit),
    highWaterMarkBefore: decimal(previousHighWaterMark),
    highWaterMarkAfter: decimal(highWaterMarkAfter),
    lossCarryForwardBefore: decimal(previousLossCarryForward),
    lossCarryForwardAfter: decimal(lossCarryForwardAfter),
    mivoShareAmount: decimal(mivoShareAmount),
    investorShareAmount: decimal(eligibleProfit - mivoShareAmount),
    unrealizedPnl: decimal(unrealizedPnl),
  };
}
