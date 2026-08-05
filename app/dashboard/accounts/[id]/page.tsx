import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import AccountAnalytics from "./AccountAnalytics";

const statusStyles: Record<string, string> = {
  PENDING: "bg-yellow-500/20 text-yellow-400",
  ACTIVE: "bg-green-500/20 text-green-400",
  PASSED: "bg-blue-500/20 text-blue-400",
  FAILED: "bg-red-500/20 text-red-400",
};

const statusMap: Record<string, string> = {
  PENDING: "Pending",
  ACTIVE: "Active",
  PASSED: "Passed",
  FAILED: "Failed",
};

function money(value: number) {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function stageLabel(stage: string) {
  switch (stage) {
    case "PHASE_1":
      return "Phase 1";

    case "PHASE_2":
      return "Phase 2";

      case "PHASE_3":
  return "Phase 3";

    case "FUNDED":
      return "Funded";

    default:
      return stage;
  }
}

function accountTypeLabel(accountType: string) {
  switch (accountType) {
    case "THREE_STEP":
  return "Three-Step";

    case "ONE_STEP":
      return "One-Step";

    case "TWO_STEP":
      return "Two-Step";

    case "INSTANT":
      return "Instant Funding";

    default:
      return accountType;
  }
}

export default async function AccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

 const challenge =
  await prisma.challenge.findUnique({
    where: {
      id,
    },

    include: {
      trades: {
        orderBy: {
          openedAt: "desc",
        },
      },

      snapshots: {
        orderBy: {
          recordedAt: "asc",
        },

        take: 500,
      },
    },
  });

  if (!challenge) {
    return notFound();
  }

  const isFunded =
    challenge.stage === "FUNDED";

  const isEvaluation =
  challenge.stage === "PHASE_1" ||
  challenge.stage === "PHASE_2" ||
  challenge.stage === "PHASE_3";

  /*
   * PROFIT TARGET
   */

  const profitTargetAmount =
    challenge.startingBalance *
    (challenge.profitTarget / 100);

  const profitProgress =
    profitTargetAmount > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (challenge.profit /
              profitTargetAmount) *
              100
          )
        )
      : 0;

  /*
   * TRADING DAYS
   */

  const tradingDaysProgress =
    challenge.minimumTradeDays > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (challenge.tradingDays /
              challenge.minimumTradeDays) *
              100
          )
        )
      : 100;

  /*
   * DAILY DRAWDOWN
   */

  const dailyReferenceBalance =
    challenge.dailyStartingBalance ??
    challenge.startingBalance;

  const dailyLossLimit =
    dailyReferenceBalance *
    (challenge.dailyDrawdown / 100);

  const dailyCurrentLoss = Math.max(
    0,
    dailyReferenceBalance -
      challenge.currentEquity
  );

  const dailyDrawdownProgress =
    dailyLossLimit > 0
      ? Math.min(
          100,
          (dailyCurrentLoss /
            dailyLossLimit) *
            100
        )
      : 0;

  const dailyBreached =
    dailyLossLimit > 0 &&
    dailyCurrentLoss >= dailyLossLimit;

  /*
   * MAXIMUM DRAWDOWN
   */

  const maximumLossLimit =
    challenge.startingBalance *
    (challenge.maxDrawdown / 100);

  const maximumCurrentLoss = Math.max(
    0,
    challenge.startingBalance -
      challenge.currentEquity
  );

  const maximumDrawdownProgress =
    maximumLossLimit > 0
      ? Math.min(
          100,
          (maximumCurrentLoss /
            maximumLossLimit) *
            100
        )
      : 0;

  const maximumBreached =
    maximumLossLimit > 0 &&
    maximumCurrentLoss >=
      maximumLossLimit;

  return (
    <main className="min-h-screen bg-black px-5 py-8 text-white md:px-8 lg:p-10">
      <div className="mx-auto max-w-6xl">
        {/* BACK NAVIGATION */}

        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-semibold text-gray-300 transition hover:border-green-500 hover:text-green-400"
          >
            <span>←</span>
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {/* HEADER */}

        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Trading Account
            </p>

            <h1 className="text-4xl font-bold text-green-500 md:text-5xl">
              {challenge.account}
            </h1>

            <p className="mt-2 text-gray-400">
              {challenge.type}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-semibold text-gray-300">
                {accountTypeLabel(
                  challenge.accountType
                )}
              </span>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  isFunded
                    ? "bg-purple-500/20 text-purple-400"
                    : "bg-zinc-800 text-gray-300"
                }`}
              >
                {stageLabel(challenge.stage)}
              </span>
            </div>
          </div>

          <span
            className={`rounded-full px-5 py-2 font-semibold ${
              statusStyles[
                challenge.status
              ] ??
              "bg-gray-700 text-gray-300"
            }`}
          >
            {statusMap[
              challenge.status
            ] ?? challenge.status}
          </span>
        </div>

        {/* ACCOUNT OVERVIEW */}

        <div className="mt-10">
          <h2 className="mb-5 text-2xl font-bold">
            Account Overview
          </h2>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-5">
            <StatCard
              title="Starting Balance"
              value={money(
                challenge.startingBalance
              )}
            />

            <StatCard
              title="Current Balance"
              value={money(
                challenge.currentBalance
              )}
            />

            <StatCard
              title="Equity"
              value={money(
                challenge.currentEquity
              )}
            />

            <StatCard
              title="Profit"
              value={money(challenge.profit)}
              valueClass={
                challenge.profit >= 0
                  ? "text-green-400"
                  : "text-red-400"
              }
            />

            <StatCard
              title="Withdrawable Profit"
              value={money(
                challenge.withdrawableProfit
              )}
              valueClass="text-green-400"
            />
          </div>
        </div>

        {/* ACCOUNT STAGE */}

        <div className="mt-10">
          <h2 className="mb-5 text-2xl font-bold">
            Account Stage
          </h2>

          <div className="grid gap-5 md:grid-cols-3">
            <StatCard
              title="Account Type"
              value={accountTypeLabel(
                challenge.accountType
              )}
            />

            <StatCard
              title="Current Stage"
              value={stageLabel(
                challenge.stage
              )}
              valueClass={
                isFunded
                  ? "text-purple-400"
                  : "text-white"
              }
            />

            <StatCard
              title="Stage Status"
              value={
                statusMap[
                  challenge.status
                ] ?? challenge.status
              }
              valueClass={
                challenge.status ===
                "ACTIVE"
                  ? "text-green-400"
                  : challenge.status ===
                      "FAILED"
                    ? "text-red-400"
                    : challenge.status ===
                        "PASSED"
                      ? "text-blue-400"
                      : "text-yellow-400"
              }
            />
          </div>
        </div>

        {/* EVALUATION PROGRESS */}

        {isEvaluation && (
          <div className="mt-10">
            <h2 className="mb-5 text-2xl font-bold">
              Challenge Progress
            </h2>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
              <div className="grid gap-8 md:grid-cols-2">
                <ProgressItem
                  title="Profit Target"
                  current={money(
                    challenge.profit
                  )}
                  target={money(
                    profitTargetAmount
                  )}
                  percentage={
                    profitProgress
                  }
                  status={
                    challenge.profit >=
                      profitTargetAmount &&
                    profitTargetAmount > 0
                      ? "Completed"
                      : "In Progress"
                  }
                  danger={false}
                />

                <ProgressItem
                  title="Minimum Trading Days"
                  current={`${challenge.tradingDays} Days`}
                  target={`${challenge.minimumTradeDays} Days`}
                  percentage={
                    tradingDaysProgress
                  }
                  status={
                    challenge.tradingDays >=
                    challenge.minimumTradeDays
                      ? "Completed"
                      : "In Progress"
                  }
                  danger={false}
                />

                <ProgressItem
                  title="Daily Drawdown"
                  current={`${money(
                    dailyCurrentLoss
                  )} Used`}
                  target={money(
                    dailyLossLimit
                  )}
                  percentage={
                    dailyDrawdownProgress
                  }
                  status={
                    dailyBreached
                      ? "Breached"
                      : `${dailyDrawdownProgress.toFixed(
                          1
                        )}% Used`
                  }
                  danger={dailyBreached}
                />

                <ProgressItem
                  title="Maximum Drawdown"
                  current={`${money(
                    maximumCurrentLoss
                  )} Used`}
                  target={money(
                    maximumLossLimit
                  )}
                  percentage={
                    maximumDrawdownProgress
                  }
                  status={
                    maximumBreached
                      ? "Breached"
                      : `${maximumDrawdownProgress.toFixed(
                          1
                        )}% Used`
                  }
                  danger={
                    maximumBreached
                  }
                />
              </div>

              {challenge.breachReason && (
                <BreachMessage
                  reason={
                    challenge.breachReason
                  }
                />
              )}
            </div>
          </div>
        )}

        {/* FUNDED ACCOUNT */}

        {isFunded && (
          <div className="mt-10">
            <h2 className="mb-5 text-2xl font-bold">
              Funded Account
            </h2>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
              <div className="mb-6">
                <p className="text-sm text-gray-400">
                  This account is in the
                  funded stage. There is no
                  evaluation profit target.
                </p>
              </div>

              <div className="grid gap-8 md:grid-cols-2">
                <ProgressItem
                  title="Daily Drawdown"
                  current={`${money(
                    dailyCurrentLoss
                  )} Used`}
                  target={money(
                    dailyLossLimit
                  )}
                  percentage={
                    dailyDrawdownProgress
                  }
                  status={
                    dailyBreached
                      ? "Breached"
                      : `${dailyDrawdownProgress.toFixed(
                          1
                        )}% Used`
                  }
                  danger={dailyBreached}
                />

                <ProgressItem
                  title="Maximum Drawdown"
                  current={`${money(
                    maximumCurrentLoss
                  )} Used`}
                  target={money(
                    maximumLossLimit
                  )}
                  percentage={
                    maximumDrawdownProgress
                  }
                  status={
                    maximumBreached
                      ? "Breached"
                      : `${maximumDrawdownProgress.toFixed(
                          1
                        )}% Used`
                  }
                  danger={
                    maximumBreached
                  }
                />
              </div>

              {challenge.breachReason && (
                <BreachMessage
                  reason={
                    challenge.breachReason
                  }
                />
              )}
            </div>
          </div>
        )}

{/* PERFORMANCE + TRADE JOURNAL */}

<AccountAnalytics
  startingBalance={
    challenge.startingBalance
  }
  snapshots={challenge.snapshots.map(
    (snapshot) => ({
      id: snapshot.id,
      balance: snapshot.balance,
      equity: snapshot.equity,
      recordedAt:
        snapshot.recordedAt.toISOString(),
    })
  )}
  trades={challenge.trades.map(
    (trade) => ({
      id: trade.id,
      ticket: trade.ticket,
      symbol: trade.symbol,
      type: trade.type,
      volume: trade.volume,
      openPrice: trade.openPrice,
      closePrice: trade.closePrice,
      stopLoss: trade.stopLoss,
      takeProfit: trade.takeProfit,
      openedAt:
        trade.openedAt.toISOString(),
      closedAt:
        trade.closedAt?.toISOString() ??
        null,
      commission: trade.commission,
      swap: trade.swap,
      profit: trade.profit,
    })
  )}
/>
        {/* ACCOUNT DETAILS */}

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {/* TRADING ACCOUNT */}

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="mb-2 text-xl font-bold">
              Trading Account
            </h2>

            <p className="mb-6 text-sm text-gray-500">
              Platform credentials and connection details.
            </p>

            <div className="space-y-4">
              <Row
                label="Platform"
                value={
                  challenge.platform ||
                  "Pending"
                }
              />

              <Row
                label="Broker"
                value={
                  challenge.broker ||
                  "Pending"
                }
              />

              <Row
                label="Server"
                value={
                  challenge.server ||
                  "Pending"
                }
              />

              <Row
                label="Login"
                value={
                  challenge.mt5Login ||
                  "Pending"
                }
              />

              <Row
                label="Password"
                value={
                  challenge.mt5Password ||
                  "Pending"
                }
              />

              <Row
                label="Investor"
                value={
                  challenge.investorPassword ||
                  "Pending"
                }
              />
            </div>
          </div>

          {/* OBJECTIVES */}

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="mb-2 text-xl font-bold">
              {isFunded
                ? "Trading Rules"
                : "Trading Objectives"}
            </h2>

            <p className="mb-6 text-sm text-gray-500">
              Rules and objectives for this account.
            </p>

            <div className="space-y-4">
              {isEvaluation && (
                <Row
                  label="Profit Target"
                  value={`${challenge.profitTarget}%`}
                />
              )}

              <Row
                label="Daily Drawdown"
                value={`${challenge.dailyDrawdown}%`}
              />

              <Row
                label="Max Drawdown"
                value={`${challenge.maxDrawdown}%`}
              />

              {isEvaluation && (
                <Row
                  label="Minimum Trading Days"
                  value={`${challenge.minimumTradeDays} Days`}
                />
              )}

              {isFunded && (
                <Row
                  label="Profit Target"
                  value="None"
                />
              )}
            </div>

            <a
              href="https://www.metatrader5.com/en/download"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-block rounded-xl bg-green-500 px-6 py-3 font-bold text-black transition hover:bg-green-400"
            >
              Download MT5
            </a>
          </div>
        </div>

        {/* BOTTOM NAVIGATION */}

        <div className="mt-10 border-t border-zinc-800 pt-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-400 transition hover:text-green-400"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
  valueClass = "text-white",
}: {
  title: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-sm text-gray-400">
        {title}
      </p>

      <p
        className={`mt-2 text-2xl font-bold ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}

function ProgressItem({
  title,
  current,
  target,
  percentage,
  status,
  danger,
}: {
  title: string;
  current: string;
  target: string;
  percentage: number;
  status: string;
  danger: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="font-semibold">
          {title}
        </p>

        <span
          className={`text-sm font-semibold ${
            danger
              ? "text-red-400"
              : status === "Completed"
                ? "text-green-400"
                : "text-gray-400"
          }`}
        >
          {status}
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-4">
        <p className="text-xl font-bold">
          {current}
        </p>

        <p className="text-sm text-gray-500">
          Limit/Target: {target}
        </p>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all ${
            danger
              ? "bg-red-500"
              : "bg-green-500"
          }`}
          style={{
            width: `${Math.min(
              100,
              Math.max(
                0,
                percentage
              )
            )}%`,
          }}
        />
      </div>

      <p className="mt-2 text-xs text-gray-500">
        {percentage.toFixed(1)}%
      </p>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-5 border-b border-zinc-800 pb-3">
      <span className="text-gray-400">
        {label}
      </span>

      <span className="text-right font-semibold">
        {value}
      </span>
    </div>
  );
}

function BreachMessage({
  reason,
}: {
  reason: string;
}) {
  return (
    <div className="mt-8 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
      <p className="font-semibold text-red-400">
        Account Breach
      </p>

      <p className="mt-1 text-sm text-red-300">
        {reason}
      </p>
    </div>
  );
}