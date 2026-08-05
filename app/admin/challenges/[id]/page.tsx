import AssignForm from "./AssignForm";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

const accountTypeLabels: Record<string, string> = {
  ONE_STEP: "One-Step",
  TWO_STEP: "Two-Step",
  THREE_STEP: "Three-Step",
  INSTANT: "Instant Funding",
};

const stageLabels: Record<string, string> = {
  PHASE_1: "Phase 1",
  PHASE_2: "Phase 2",
  PHASE_3: "Phase 3",
  FUNDED: "Funded",
};

const statusLabels: Record<string, string> = {
  PENDING: "Pending",
  ACTIVE: "Active",
  PASSED: "Passed",
  FAILED: "Failed",
};

const statusStyles: Record<string, string> = {
  PENDING: "bg-yellow-500/15 text-yellow-400",
  ACTIVE: "bg-green-500/15 text-green-400",
  PASSED: "bg-blue-500/15 text-blue-400",
  FAILED: "bg-red-500/15 text-red-400",
};

export default async function AssignAccountPage({
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
      user: true,
    },
  });

  if (!challenge) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6 sm:py-8 lg:px-10">
      <div className="mx-auto w-full max-w-4xl">
        {/* BACK */}
        <Link
          href="/admin/challenges"
          className="inline-flex items-center text-xs font-bold text-gray-500 transition hover:text-green-400 sm:text-sm"
        >
          ← Challenge Management
        </Link>

        {/* HEADER */}
        <section className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-7">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-green-500 sm:text-xs">
            Mivo Capital Admin
          </p>

          <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-4xl">
            Trading Account Management
          </h1>

          <div className="mt-4 rounded-xl bg-black p-4">
            <p className="break-words text-sm font-bold text-white sm:text-base">
              {challenge.user.name}
            </p>

            <p className="mt-1 break-all text-xs text-gray-500 sm:text-sm">
              {challenge.user.email}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-lg bg-zinc-800 px-3 py-1.5 text-[11px] font-bold text-gray-300 sm:text-xs">
              {challenge.account}
            </span>

            <span className="rounded-lg bg-zinc-800 px-3 py-1.5 text-[11px] font-bold text-gray-300 sm:text-xs">
              {accountTypeLabels[
                challenge.accountType
              ] ?? challenge.accountType}
            </span>

            <span
              className={`rounded-lg px-3 py-1.5 text-[11px] font-bold sm:text-xs ${
                challenge.stage === "FUNDED"
                  ? "bg-purple-500/15 text-purple-400"
                  : "bg-zinc-800 text-gray-300"
              }`}
            >
              {stageLabels[challenge.stage] ??
                challenge.stage}
            </span>

            <span
              className={`rounded-lg px-3 py-1.5 text-[11px] font-bold sm:text-xs ${
                statusStyles[challenge.status] ??
                "bg-zinc-800 text-gray-300"
              }`}
            >
              {statusLabels[challenge.status] ??
                challenge.status}
            </span>
          </div>
        </section>

        {/* ASSIGN ACCOUNT */}
        <section className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:mt-6 sm:p-7">
          <h2 className="text-xl font-black sm:text-2xl">
            Assign Trading Account
          </h2>

          <p className="mt-2 text-xs leading-5 text-gray-500 sm:text-sm sm:leading-6">
            Assign or update the trader&apos;s platform and
            trading credentials.
          </p>

          <div className="mt-6 min-w-0">
            <AssignForm
              challengeId={challenge.id}
              platform={challenge.platform ?? "MT5"}
              broker={challenge.broker ?? "Eightcap"}
              server={challenge.server ?? ""}
              login={challenge.mt5Login ?? ""}
              password={challenge.mt5Password ?? ""}
              investorPassword={
                challenge.investorPassword ?? ""
              }
            />
          </div>
        </section>

        {/* ACCOUNT OVERVIEW */}
        <section className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:mt-6 sm:p-7">
          <div>
            <h2 className="text-xl font-black sm:text-2xl">
              Trading Account Overview
            </h2>

            <p className="mt-2 text-xs leading-5 text-gray-500 sm:text-sm sm:leading-6">
              Trading performance and evaluation data are
              updated automatically by the Mivo trading
              system.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
            <OverviewField
              label="Account Type"
              value={
                accountTypeLabels[
                  challenge.accountType
                ] ?? challenge.accountType
              }
            />

            <OverviewField
              label="Stage"
              value={
                stageLabels[challenge.stage] ??
                challenge.stage
              }
              valueClass={
                challenge.stage === "FUNDED"
                  ? "text-purple-400"
                  : "text-white"
              }
            />

            <OverviewField
              label="Status"
              value={
                statusLabels[challenge.status] ??
                challenge.status
              }
              valueClass={
                challenge.status === "ACTIVE"
                  ? "text-green-400"
                  : challenge.status === "PASSED"
                  ? "text-blue-400"
                  : challenge.status === "FAILED"
                  ? "text-red-400"
                  : "text-yellow-400"
              }
            />

            <OverviewField
              label="MT5 Login"
              value={
                challenge.mt5Login ||
                "Not assigned"
              }
            />

            <OverviewField
              label="Starting Balance"
              value={money(
                challenge.startingBalance
              )}
            />

            <OverviewField
              label="Current Balance"
              value={money(
                challenge.currentBalance
              )}
            />

            <OverviewField
              label="Current Equity"
              value={money(
                challenge.currentEquity
              )}
            />

            <OverviewField
              label="Profit"
              value={money(challenge.profit)}
              valueClass={
                challenge.profit >= 0
                  ? "text-green-400"
                  : "text-red-400"
              }
            />

            <OverviewField
              label="Profit Target"
              value={`${challenge.profitTarget}%`}
            />

            <OverviewField
              label="Daily Drawdown"
              value={`${challenge.dailyDrawdown}%`}
            />

            <OverviewField
              label="Maximum Drawdown"
              value={`${challenge.maxDrawdown}%`}
            />

            <OverviewField
              label="Trading Days"
              value={`${challenge.tradingDays} / ${challenge.minimumTradeDays}`}
            />

            <OverviewField
              label="Withdrawable Profit"
              value={money(
                challenge.withdrawableProfit
              )}
              valueClass="text-green-400"
            />

            <OverviewField
              label="Last Daily Reset"
              value={
                challenge.lastDailyReset
                  ? challenge.lastDailyReset.toLocaleString()
                  : "Not available"
              }
            />
          </div>

          {challenge.breachReason && (
            <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 sm:p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-red-400">
                Breach Reason
              </p>

              <p className="mt-2 break-words text-xs leading-5 text-red-300 sm:text-sm">
                {challenge.breachReason}
              </p>
            </div>
          )}
        </section>

        {/* BOTTOM */}
        <div className="mt-7 border-t border-zinc-900 pb-4 pt-6">
          <Link
            href="/admin/challenges"
            className="text-xs font-bold text-gray-500 transition hover:text-green-400 sm:text-sm"
          >
            ← Back to Challenges
          </Link>
        </div>
      </div>
    </main>
  );
}

function OverviewField({
  label,
  value,
  valueClass = "text-white",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-zinc-800 bg-black p-3 sm:p-4">
      <p className="text-[9px] font-bold uppercase leading-4 tracking-wide text-gray-600 sm:text-xs">
        {label}
      </p>

      <p
        className={`mt-1.5 break-words text-xs font-black sm:mt-2 sm:text-sm ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}

function money(value: number) {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}