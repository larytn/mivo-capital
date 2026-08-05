export type AccountType =
  | "THREE_STEP"
  | "ONE_STEP"
  | "TWO_STEP"
  | "INSTANT";

export type AccountStage =
  | "PHASE_1"
  | "PHASE_2"
  | "PHASE_3"
  | "FUNDED";

export type AccountStatus =
  | "PENDING"
  | "ACTIVE"
  | "PASSED"
  | "FAILED";

type TradingEngineInput = {
  accountType: string;
  stage: string;
  status: string;

  startingBalance: number;
  currentBalance: number;
  currentEquity: number;

  profitTarget: number;
  dailyDrawdown: number;
  maxDrawdown: number;

  minimumTradeDays: number;
  tradingDays: number;

  dailyStartingBalance: number | null;
  dailyStartingEquity: number | null;
  lastDailyReset: Date | null;

  breachReason: string | null;
};

export type TradingEngineResult = {
  accountType: string;
  stage: string;
  status: string;

  profit: number;
  breachReason: string | null;

  dailyStartingBalance: number;
  dailyStartingEquity: number;
  lastDailyReset: Date;

  newTradingDay: boolean;

  profitTargetReached: boolean;
  minimumDaysReached: boolean;

  dailyDrawdownBreached: boolean;
  maximumDrawdownBreached: boolean;

  requiredProfit: number;

  dailyLossAmount: number;
  dailyDrawdownLevel: number;

  maximumLossAmount: number;
  maximumDrawdownLevel: number;
};

export function evaluateTradingAccount(
  input: TradingEngineInput
): TradingEngineResult {
  const now = new Date();

  /*
   * PROFIT
   */

  const profit =
    input.currentBalance -
    input.startingBalance;

  /*
   * ACCOUNT MODE
   *
   * Evaluation:
   * ONE_STEP → PHASE_1
   * TWO_STEP → PHASE_1 / PHASE_2
   *
   * Funded:
   * ONE_STEP → FUNDED
   * TWO_STEP → FUNDED
   * INSTANT → FUNDED
   */

  const isFunded =
    input.stage === "FUNDED";

  const isEvaluation =
  input.stage === "PHASE_1" ||
  input.stage === "PHASE_2" ||
  input.stage === "PHASE_3";
  /*
   * DAILY RESET
   */

  const todayUTC = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );

  let lastResetUTC: number | null = null;

  if (input.lastDailyReset) {
    lastResetUTC = Date.UTC(
      input.lastDailyReset.getUTCFullYear(),
      input.lastDailyReset.getUTCMonth(),
      input.lastDailyReset.getUTCDate()
    );
  }

  const newTradingDay =
    lastResetUTC === null ||
    todayUTC > lastResetUTC;

  /*
   * DAILY REFERENCE
   */

  let dailyStartingBalance =
    input.dailyStartingBalance ??
    input.startingBalance;

  let dailyStartingEquity =
    input.dailyStartingEquity ??
    input.startingBalance;

  if (newTradingDay) {
    dailyStartingBalance =
      input.currentBalance > 0
        ? input.currentBalance
        : input.startingBalance;

    dailyStartingEquity =
      input.currentEquity > 0
        ? input.currentEquity
        : dailyStartingBalance;
  }

  /*
   * PROFIT TARGET
   *
   * Funded accounts do NOT pass another
   * evaluation target.
   */

  const requiredProfit = isEvaluation
    ? input.startingBalance *
      (input.profitTarget / 100)
    : 0;

  const profitTargetReached =
    isEvaluation &&
    profit >= requiredProfit;

  /*
   * MINIMUM TRADING DAYS
   *
   * Used for evaluation progression.
   */

  const minimumDaysReached =
    isEvaluation &&
    input.tradingDays >=
      input.minimumTradeDays;

  /*
   * DAILY DRAWDOWN
   */

  const dailyLossAmount =
    dailyStartingBalance *
    (input.dailyDrawdown / 100);

  const dailyDrawdownLevel =
    dailyStartingBalance -
    dailyLossAmount;

  const dailyDrawdownBreached =
    dailyStartingBalance > 0 &&
    input.currentEquity <=
      dailyDrawdownLevel;

  /*
   * MAXIMUM DRAWDOWN
   */

  const maximumLossAmount =
    input.startingBalance *
    (input.maxDrawdown / 100);

  const maximumDrawdownLevel =
    input.startingBalance -
    maximumLossAmount;

  const maximumDrawdownBreached =
    input.startingBalance > 0 &&
    input.currentEquity <=
      maximumDrawdownLevel;

  /*
   * STATUS ENGINE
   *
   * Status is now ONLY:
   *
   * PENDING
   * ACTIVE
   * PASSED
   * FAILED
   */

  let finalStatus = input.status;
  let breachReason = input.breachReason;

  /*
   * ACTIVE ACCOUNTS CAN FAIL
   *
   * Applies to both evaluation and funded.
   */

  if (
    input.status === "ACTIVE" &&
    dailyDrawdownBreached
  ) {
    finalStatus = "FAILED";

    breachReason =
      `Daily drawdown breached. Equity reached ${money(
        input.currentEquity
      )}. Minimum allowed equity for the day was ${money(
        dailyDrawdownLevel
      )}.`;
  } else if (
    input.status === "ACTIVE" &&
    maximumDrawdownBreached
  ) {
    finalStatus = "FAILED";

    breachReason =
      `Maximum drawdown breached. Equity reached ${money(
        input.currentEquity
      )}. Minimum allowed equity was ${money(
        maximumDrawdownLevel
      )}.`;
  }

  /*
   * EVALUATION PASS
   *
   * Funded accounts NEVER become PASSED.
   */

  if (
    finalStatus === "ACTIVE" &&
    isEvaluation &&
    profitTargetReached &&
    minimumDaysReached &&
    !breachReason
  ) {
    finalStatus = "PASSED";
  }

  /*
   * INSTANT ACCOUNTS
   *
   * Instant accounts live directly in FUNDED.
   * They can remain ACTIVE or become FAILED,
   * but they never pass an evaluation.
   */

  if (
    input.accountType === "INSTANT" &&
    isFunded &&
    finalStatus === "PASSED"
  ) {
    finalStatus = "ACTIVE";
  }

  return {
    accountType: input.accountType,
    stage: input.stage,
    status: finalStatus,

    profit,
    breachReason,

    dailyStartingBalance,
    dailyStartingEquity,

    lastDailyReset: newTradingDay
      ? now
      : input.lastDailyReset ?? now,

    newTradingDay,

    profitTargetReached,
    minimumDaysReached,

    dailyDrawdownBreached,
    maximumDrawdownBreached,

    requiredProfit,

    dailyLossAmount,
    dailyDrawdownLevel,

    maximumLossAmount,
    maximumDrawdownLevel,
  };
}

function money(value: number) {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}