import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import AccountAnalytics from "./AccountAnalytics";

const statusStyles: Record<string, string> = {
  PENDING: "bg-yellow-500/15 text-yellow-400",
  ACTIVE: "bg-green-500/15 text-green-400",
  PASSED: "bg-blue-500/15 text-blue-400",
  FAILED: "bg-red-500/15 text-red-400",
};

const statusMap: Record<string, string> = {
  PENDING: "Pending",
  ACTIVE: "Active",
  PASSED: "Passed",
  FAILED: "Failed",
};

function money(value: number) {
  return `$${Number(value || 0).toLocaleString("en-US", {
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
    case "TWO_STEP":
      return "Two-Step";
    case "ONE_STEP":
      return "One-Step";
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

  const challenge = await prisma.challenge.findUnique({
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

  const isFunded = challenge.stage === "FUNDED";

  const isEvaluation =
    challenge.stage === "PHASE_1" ||
    challenge.stage === "PHASE_2" ||
    challenge.stage === "PHASE_3";

  const profitTargetAmount =
    challenge.startingBalance *
    (challenge.profitTarget / 100);

  const profitProgress =
    profitTargetAmount > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (challenge.profit / profitTargetAmount) * 100
          )
        )
      : 0;

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
          (dailyCurrentLoss / dailyLossLimit) * 100
        )
      : 0;

  const dailyBreached =
    dailyLossLimit > 0 &&
    dailyCurrentLoss >= dailyLossLimit;

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
    maximumCurrentLoss >= maximumLossLimit;

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6 sm:py-8 lg:px-10">
      <div className="mx-auto w-full max-w-6xl">
        {/* BACK */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 transition hover:text-green-400 sm:text-sm"
        >
          ← Back to Dashboard
        </Link>

        {/* HEADER */}
        <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-500 sm:text-xs">
                Trading Account
              </p>

              <h1 className="mt-2 break-words text-3xl font-black text-white sm:text-4xl">
                {challenge.account}
              </h1>

              <p className="mt-2 break-words text-sm text-gray-500">
                {challenge.type}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-zinc-800 px-3 py-1.5 text-[11px] font-bold text-gray-300">
                  {accountTypeLabel(
                    challenge.accountType
                  )}
                </span>

                <span
                  className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${
                    isFunded
                      ? "bg-purple-500/15 text-purple-400"
                      : "bg-zinc-800 text-gray-300"
                  }`}
                >
                  {stageLabel(challenge.stage)}
                </span>
              </div>
            </div>

            <div>
              <span
                className={`inline-flex rounded-full px-4 py-2 text-xs font-bold ${
                  statusStyles[challenge.status] ??
                  "bg-zinc-800 text-gray-300"
                }`}
              >
                {statusMap[challenge.status] ??
                  challenge.status}
              </span>
            </div>
          </div>
        </section>

        {/* OVERVIEW */}
        <section className="mt-8">
          <SectionHeading
            title="Account Overview"
            subtitle="Current trading account performance."
          />

          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
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

            <div className="col-span-2 lg:col-span-1">
              <StatCard
                title="Withdrawable"
                value={money(
                  challenge.withdrawableProfit
                )}
                valueClass="text-green-400"
              />
            </div>
          </div>
        </section>

        {/* STAGE */}
        <section className="mt-8">
          <SectionHeading title="Account Stage" />

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
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

            <div className="col-span-2 md:col-span-1">
              <StatCard
                title="Stage Status"
                value={
                  statusMap[challenge.status] ??
                  challenge.status
                }
                valueClass={
                  challenge.status === "ACTIVE"
                    ? "text-green-400"
                    : challenge.status === "FAILED"
                    ? "text-red-400"
                    : challenge.status === "PASSED"
                    ? "text-blue-400"
                    : "text-yellow-400"
                }
              />
            </div>
          </div>
        </section>

        {/* EVALUATION */}
        {isEvaluation && (
          <section className="mt-8">
            <SectionHeading
              title="Challenge Progress"
              subtitle="Track your objectives and drawdown limits."
            />

            <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-7">
              <div className="grid gap-7 md:grid-cols-2">
                <ProgressItem
                  title="Profit Target"
                  current={money(
                    challenge.profit
                  )}
                  target={money(
                    profitTargetAmount
                  )}
                  percentage={profitProgress}
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
                  target={money(dailyLossLimit)}
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
                  danger={maximumBreached}
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
          </section>
        )}

        {/* FUNDED */}
        {isFunded && (
          <section className="mt-8">
            <SectionHeading
              title="Funded Account"
              subtitle="Your funded account risk limits."
            />

            <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-7">
              <div className="rounded-xl border border-zinc-800 bg-black p-4">
                <p className="text-xs leading-5 text-gray-400 sm:text-sm">
                  This account is in the funded
                  stage. There is no evaluation
                  profit target.
                </p>
              </div>

              <div className="mt-7 grid gap-7 md:grid-cols-2">
                <ProgressItem
                  title="Daily Drawdown"
                  current={`${money(
                    dailyCurrentLoss
                  )} Used`}
                  target={money(dailyLossLimit)}
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
                  danger={maximumBreached}
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
          </section>
        )}

        {/* ANALYTICS */}
        <div className="mt-8 min-w-0 overflow-hidden">
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
                commission:
                  trade.commission,
                swap: trade.swap,
                profit: trade.profit,
              })
            )}
          />
        </div>

        {/* DETAILS */}
        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          {/* TRADING ACCOUNT */}
          <div className="min-w-0 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-7">
            <h2 className="text-xl font-black">
              Trading Account
            </h2>

            <p className="mt-2 text-xs leading-5 text-gray-500 sm:text-sm">
              Platform credentials and connection
              details.
            </p>

            <div className="mt-6 space-y-4">
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
          <div className="min-w-0 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-7">
            <h2 className="text-xl font-black">
              {isFunded
                ? "Trading Rules"
                : "Trading Objectives"}
            </h2>

            <p className="mt-2 text-xs leading-5 text-gray-500 sm:text-sm">
              Rules and objectives for this
              account.
            </p>

            <div className="mt-6 space-y-4">
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
              className="mt-7 block w-full rounded-xl bg-green-500 px-6 py-3.5 text-center text-sm font-black text-black transition hover:bg-green-400 sm:inline-block sm:w-auto"
            >
              Download MT5
            </a>
          </div>
        </section>

        {/* BOTTOM */}
        <div className="mt-8 border-t border-zinc-800 pb-4 pt-6">
          <Link
            href="/dashboard"
            className="text-xs font-semibold text-gray-500 transition hover:text-green-400 sm:text-sm"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      <h2 className="text-xl font-black sm:text-2xl">
        {title}
      </h2>

      {subtitle && (
        <p className="mt-1 text-xs text-gray-500 sm:text-sm">
          {subtitle}
        </p>
      )}
    </div>
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
    <div className="h-full min-w-0 rounded-xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5">
      <p className="text-[11px] leading-4 text-gray-500 sm:text-sm">
        {title}
      </p>

      <p
        className={`mt-2 break-words text-base font-black sm:text-xl ${valueClass}`}
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
    <div className="min-w-0">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-bold">
          {title}
        </p>

        <span
          className={`shrink-0 text-[11px] font-bold ${
            danger
              ? "text-red-400"
              : status === "Completed"
              ? "text-green-400"
              : "text-gray-500"
          }`}
        >
          {status}
        </span>
      </div>

      <div className="mt-3">
        <p className="break-words text-lg font-black sm:text-xl">
          {current}
        </p>

        <p className="mt-1 break-words text-[11px] text-gray-500 sm:text-xs">
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
              Math.max(0, percentage)
            )}%`,
          }}
        />
      </div>

      <p className="mt-2 text-[10px] text-gray-600">
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
    <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-4 border-b border-zinc-800 pb-3 last:border-0">
      <span className="text-xs text-gray-500 sm:text-sm">
        {label}
      </span>

      <span className="min-w-0 break-all text-right text-xs font-bold text-gray-200 sm:text-sm">
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
    <div className="mt-7 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
      <p className="text-sm font-bold text-red-400">
        Account Breach
      </p>

      <p className="mt-2 break-words text-xs leading-5 text-red-300 sm:text-sm">
        {reason}
      </p>
    </div>
  );
}