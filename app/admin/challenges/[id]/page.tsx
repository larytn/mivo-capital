import AssignForm from "./AssignForm";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

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
  PENDING: "bg-yellow-500/20 text-yellow-400",
  ACTIVE: "bg-green-500/20 text-green-400",
  PASSED: "bg-blue-500/20 text-blue-400",
  FAILED: "bg-red-500/20 text-red-400",
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
    <main className="min-h-screen bg-black p-10 text-white">
      <div className="mx-auto max-w-3xl">

        {/* HEADER */}

        <div className="mb-8 rounded-2xl bg-zinc-900 p-8">
          <h1 className="text-4xl font-bold text-green-500">
            Trading Account Management
          </h1>

          <p className="mt-2 text-gray-400">
            {challenge.user.name} ({challenge.user.email})
          </p>

          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <span className="rounded-lg bg-zinc-800 px-3 py-1.5">
              {challenge.account}
            </span>

            <span className="rounded-lg bg-zinc-800 px-3 py-1.5">
              {accountTypeLabels[challenge.accountType] ??
                challenge.accountType}
            </span>

            <span
              className={`rounded-lg px-3 py-1.5 ${
                challenge.stage === "FUNDED"
                  ? "bg-purple-500/20 text-purple-400"
                  : "bg-zinc-800 text-gray-300"
              }`}
            >
              {stageLabels[challenge.stage] ?? challenge.stage}
            </span>

            <span
              className={`rounded-lg px-3 py-1.5 ${
                statusStyles[challenge.status] ??
                "bg-zinc-800 text-gray-300"
              }`}
            >
              {statusLabels[challenge.status] ?? challenge.status}
            </span>
          </div>
        </div>

        {/* ASSIGN TRADING ACCOUNT */}

        <div className="rounded-2xl bg-zinc-900 p-8">
          <h2 className="text-2xl font-bold">
            Assign Trading Account
          </h2>

          <p className="mb-6 mt-2 text-sm text-gray-400">
            Assign or update the trader&apos;s platform and trading
            credentials.
          </p>

          <AssignForm
            challengeId={challenge.id}
            platform={challenge.platform ?? "MT5"}
            broker={challenge.broker ?? "Eightcap"}
            server={challenge.server ?? ""}
            login={challenge.mt5Login ?? ""}
            password={challenge.mt5Password ?? ""}
            investorPassword={challenge.investorPassword ?? ""}
          />
        </div>

        {/* AUTOMATED TRADING OVERVIEW */}

        <div className="mt-8 rounded-2xl bg-zinc-900 p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold">
              Trading Account Overview
            </h2>

            <p className="mt-2 text-sm text-gray-400">
              Trading performance and evaluation data are updated
              automatically by the Mivo trading system.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">

            <OverviewField
              label="Account Type"
              value={
                accountTypeLabels[challenge.accountType] ??
                challenge.accountType
              }
            />

            <OverviewField
              label="Stage"
              value={
                stageLabels[challenge.stage] ??
                challenge.stage
              }
            />

            <OverviewField
              label="Status"
              value={
                statusLabels[challenge.status] ??
                challenge.status
              }
            />

            <OverviewField
              label="MT5 Login"
              value={challenge.mt5Login || "Not assigned"}
            />

            <OverviewField
              label="Starting Balance"
              value={money(challenge.startingBalance)}
            />

            <OverviewField
              label="Current Balance"
              value={money(challenge.currentBalance)}
            />

            <OverviewField
              label="Current Equity"
              value={money(challenge.currentEquity)}
            />

            <OverviewField
              label="Profit"
              value={money(challenge.profit)}
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
              value={money(challenge.withdrawableProfit)}
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
            <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-5">
              <p className="text-sm font-semibold text-red-400">
                Breach Reason
              </p>

              <p className="mt-2 text-sm text-red-300">
                {challenge.breachReason}
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function OverviewField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <p className="mt-2 font-semibold text-white">
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