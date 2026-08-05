"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Challenge = {
  id: string;
  account: string;
  price: number;
  type: string;
  accountType: string;
  stage: string;
  status: string;
  startingBalance: number;
  currentBalance: number;
  currentEquity: number;
  profit: number;
  withdrawableProfit: number;
  mt5Login: string | null;
};

const statusMap: Record<string, string> = {
  PENDING: "Pending",
  ACTIVE: "Active",
  PASSED: "Passed",
  FAILED: "Failed",
};

const statusStyles: Record<string, string> = {
  PENDING: "bg-yellow-500/10 text-yellow-400",
  ACTIVE: "bg-green-500/10 text-green-400",
  PASSED: "bg-blue-500/10 text-blue-400",
  FAILED: "bg-red-500/10 text-red-400",
};

function money(value: number | undefined | null) {
  const amount = Number(value ?? 0);

  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getStage(challenge: Challenge) {
  switch (challenge.stage) {
    case "PHASE_1":
      return "Phase 1";
    case "PHASE_2":
      return "Phase 2";
    case "PHASE_3":
      return "Phase 3";
    case "FUNDED":
      return "Funded";
    default:
      return challenge.stage || "Unknown";
  }
}

function getAccountType(challenge: Challenge) {
  switch (challenge.accountType) {
    case "THREE_STEP":
      return "Three-Step";
    case "ONE_STEP":
      return "One-Step";
    case "TWO_STEP":
      return "Two-Step";
    case "INSTANT":
      return "Instant Funding";
    default:
      return challenge.type;
  }
}

export default function DashboardPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [kycStatus, setKycStatus] = useState<string | null>(
    null
  );

  const [referralCode, setReferralCode] = useState("");
  const [totalReferrals, setTotalReferrals] = useState(0);

  const fetchChallenges = async () => {
    try {
      setError("");

      const response = await fetch("/api/my-challenges", {
        cache: "no-store",
      });

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        throw new Error(
          "Failed to load trading accounts."
        );
      }

      const data = await response.json();

      setChallenges(data);
    } catch (error) {
      console.error("Dashboard error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to load dashboard."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchKYC = async () => {
    try {
      const response = await fetch("/api/kyc", {
        cache: "no-store",
      });

      if (!response.ok) return;

      const data = await response.json();

      setKycStatus(data.kyc?.status ?? null);
    } catch {
      setKycStatus(null);
    }
  };

  const fetchReferrals = async () => {
    try {
      const response = await fetch("/api/referrals", {
        cache: "no-store",
      });

      if (!response.ok) return;

      const data = await response.json();

      setReferralCode(data.referralCode || "");
      setTotalReferrals(data.totalReferrals || 0);
    } catch (error) {
      console.error(
        "Failed to load referral stats:",
        error
      );
    }
  };

  const refreshDashboard = async () => {
    try {
      setRefreshing(true);

      await Promise.all([
        fetchChallenges(),
        fetchKYC(),
        fetchReferrals(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchChallenges();
    fetchKYC();
    fetchReferrals();

    const interval = setInterval(() => {
      fetchChallenges();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const logout = async () => {
    await fetch("/api/logout", {
      method: "POST",
    });

    window.location.href = "/login";
  };

  const statistics = useMemo(() => {
    const totalAccounts = challenges.length;

    const activeAccounts = challenges.filter(
      (challenge) => challenge.status === "ACTIVE"
    ).length;

    const fundedAccounts = challenges.filter(
      (challenge) =>
        challenge.stage === "FUNDED" &&
        challenge.status === "ACTIVE"
    ).length;

    const totalProfit = challenges.reduce(
      (total, challenge) =>
        total + Number(challenge.profit || 0),
      0
    );

    const totalWithdrawable = challenges.reduce(
      (total, challenge) =>
        total +
        Number(challenge.withdrawableProfit || 0),
      0
    );

    return {
      totalAccounts,
      activeAccounts,
      fundedAccounts,
      totalProfit,
      totalWithdrawable,
    };
  }, [challenges]);

  const featuredAccount =
    challenges.find(
      (challenge) =>
        challenge.status === "ACTIVE" &&
        challenge.stage === "FUNDED"
    ) ??
    challenges.find(
      (challenge) => challenge.status === "ACTIVE"
    ) ??
    challenges[0];

  return (
    <div className="flex min-h-screen bg-black text-white">
      {/* SIDEBAR */}

      <aside className="hidden w-64 shrink-0 border-r border-zinc-800 bg-zinc-950 p-6 lg:block">
        <h2 className="mb-10 text-3xl font-bold text-green-500">
          Mivo Capital
        </h2>

        <nav className="space-y-5">
          <Link
            href="/dashboard"
            className="block font-medium text-green-400"
          >
            Dashboard
          </Link>

          <Link
            href="/challenges"
            className="block text-gray-300 transition hover:text-green-400"
          >
            Buy Challenge
          </Link>

          <Link
  href="/accounts"
  className="block text-gray-300 transition hover:text-green-400"
>
  Accounts
</Link>

          <Link
            href="/withdrawals"
            className="block text-gray-300 transition hover:text-green-400"
          >
            Withdrawals
          </Link>

          <Link
            href="/kyc"
            className="block text-gray-300 transition hover:text-green-400"
          >
            KYC Verification
          </Link>

          <Link
            href="/referrals"
            className="block text-gray-300 transition hover:text-green-400"
          >
            Referrals
          </Link>

          <Link
            href="/transactions"
            className="block text-gray-300 transition hover:text-green-400"
          >
            Transactions
          </Link>

<Link
  href="/support"
  className="block text-gray-300 transition hover:text-green-400"
>
  Support
</Link>

          <Link
            href="/profile"
            className="block text-gray-300 transition hover:text-green-400"
          >
            Profile
          </Link>

          <button
            onClick={logout}
            className="text-red-500 transition hover:text-red-400"
          >
            Logout
          </button>
        </nav>
      </aside>

      {/* MAIN */}

      <main className="min-w-0 flex-1 px-5 py-8 md:px-8 lg:p-10">
        {/* HEADER */}

        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <h1 className="text-3xl font-bold text-green-500 md:text-4xl">
              Dashboard
            </h1>

            <p className="mt-2 text-gray-400">
              Welcome back to Mivo Capital
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/challenges"
              className="rounded-lg border border-zinc-700 px-5 py-2.5 font-semibold transition hover:border-green-500 hover:text-green-400"
            >
              Buy Challenge
            </Link>

            <button
              onClick={refreshDashboard}
              disabled={refreshing}
              className="rounded-lg bg-green-500 px-5 py-2.5 font-semibold text-black transition hover:bg-green-400 disabled:opacity-60"
            >
              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>
          </div>
        </div>

        {/* ERROR */}

        {error && (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* SUMMARY */}

        <section className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            label="Total Accounts"
            value={String(statistics.totalAccounts)}
          />

          <SummaryCard
            label="Active Accounts"
            value={String(statistics.activeAccounts)}
          />

          <SummaryCard
            label="Funded Accounts"
            value={String(statistics.fundedAccounts)}
          />

          <SummaryCard
            label="Total Profit"
            value={money(statistics.totalProfit)}
            positive={statistics.totalProfit > 0}
            negative={statistics.totalProfit < 0}
          />

          <SummaryCard
            label="Withdrawable"
            value={money(
              statistics.totalWithdrawable
            )}
            positive={
              statistics.totalWithdrawable > 0
            }
          />
        </section>

        {/* ACCOUNT STATUS */}

        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          {/* KYC */}

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500">
                  KYC Verification
                </p>

                <h3 className="mt-2 text-xl font-bold">
                  {kycStatus === "APPROVED"
                    ? "Identity Verified"
                    : kycStatus === "PENDING"
                    ? "Verification In Review"
                    : kycStatus === "REJECTED"
                    ? "Verification Required"
                    : "Verify Your Identity"}
                </h3>

                <p className="mt-2 text-sm text-gray-400">
                  Complete verification to access
                  withdrawals and funded account
                  features.
                </p>
              </div>

              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                  kycStatus === "APPROVED"
                    ? "bg-green-500/10 text-green-400"
                    : kycStatus === "PENDING"
                    ? "bg-yellow-500/10 text-yellow-400"
                    : kycStatus === "REJECTED"
                    ? "bg-red-500/10 text-red-400"
                    : "bg-zinc-700 text-gray-300"
                }`}
              >
                {kycStatus === "APPROVED"
                  ? "Verified"
                  : kycStatus === "PENDING"
                  ? "Pending Review"
                  : kycStatus === "REJECTED"
                  ? "Rejected"
                  : "Not Verified"}
              </span>
            </div>

            <Link
              href="/kyc"
              className="mt-5 inline-block rounded-lg bg-green-500 px-5 py-2.5 font-bold text-black hover:bg-green-400"
            >
              {kycStatus === "APPROVED"
                ? "View KYC"
                : kycStatus === "PENDING"
                ? "View Status"
                : "Complete KYC"}
            </Link>
          </div>

          {/* REFERRALS */}

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500">
                  Referral Program
                </p>

                <h3 className="mt-2 text-xl font-bold">
                  Invite Traders & Earn
                </h3>
              </div>

              <div className="text-right">
                <p className="text-3xl font-black text-green-400">
                  {totalReferrals}
                </p>

                <p className="text-xs text-gray-500">
                  Referrals
                </p>
              </div>
            </div>

            {referralCode && (
              <div className="mt-4 rounded-lg bg-black p-3">
                <p className="text-xs text-gray-500">
                  Your Referral Code
                </p>

                <p className="mt-1 font-bold text-green-400">
                  {referralCode}
                </p>
              </div>
            )}

            <Link
              href="/referrals"
              className="mt-5 inline-block rounded-lg border border-zinc-700 px-5 py-2.5 font-bold hover:border-green-500 hover:text-green-400"
            >
              View Referrals
            </Link>
          </div>
        </section>

        {/* FEATURED ACCOUNT */}

        {!loading && featuredAccount && (
          <section className="mt-8 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
            <div className="flex flex-wrap items-start justify-between gap-5 border-b border-zinc-800 p-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                  Account Overview
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <h2 className="text-3xl font-bold">
                    {featuredAccount.account}
                  </h2>

                  <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-semibold text-gray-300">
                    {getAccountType(
                      featuredAccount
                    )}
                  </span>

                  <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-semibold text-gray-300">
                    {getStage(featuredAccount)}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      statusStyles[
                        featuredAccount.status
                      ] ??
                      "bg-gray-700 text-gray-300"
                    }`}
                  >
                    {statusMap[
                      featuredAccount.status
                    ] ?? featuredAccount.status}
                  </span>
                </div>

                {featuredAccount.mt5Login && (
                  <p className="mt-3 text-sm text-gray-500">
                    MT5 Login:{" "}
                    {featuredAccount.mt5Login}
                  </p>
                )}
              </div>

              <Link
                href={`/dashboard/accounts/${featuredAccount.id}`}
                className="rounded-lg bg-green-500 px-5 py-2.5 font-bold text-black hover:bg-green-400"
              >
                View Account
              </Link>
            </div>

            <div className="grid gap-px bg-zinc-800 sm:grid-cols-2 xl:grid-cols-4">
              <AccountStat
                label="Balance"
                value={money(
                  featuredAccount.currentBalance
                )}
              />

              <AccountStat
                label="Equity"
                value={money(
                  featuredAccount.currentEquity
                )}
              />

              <AccountStat
                label="Profit"
                value={money(featuredAccount.profit)}
                className={
                  featuredAccount.profit > 0
                    ? "text-green-400"
                    : featuredAccount.profit < 0
                    ? "text-red-400"
                    : ""
                }
              />

              <AccountStat
                label="Withdrawable"
                value={money(
                  featuredAccount.withdrawableProfit
                )}
                className={
                  featuredAccount.withdrawableProfit >
                  0
                    ? "text-green-400"
                    : ""
                }
              />
            </div>
          </section>
        )}

        {/* TRADING ACCOUNTS */}

        <section className="mt-10">
          <div className="mb-5 flex items-end justify-between gap-5">
            <div>
              <h2 className="text-2xl font-bold">
                Trading Accounts
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Your Mivo evaluation and funded
                accounts.
              </p>
            </div>

            {!loading &&
              challenges.length > 0 && (
                <span className="text-sm text-gray-500">
                  {challenges.length}{" "}
                  {challenges.length === 1
                    ? "account"
                    : "accounts"}
                </span>
              )}
          </div>

          {loading ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center text-gray-400">
              Loading trading accounts...
            </div>
          ) : challenges.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-10 text-center">
              <h3 className="text-xl font-bold">
                No Trading Accounts
              </h3>

              <p className="mt-2 text-gray-400">
                Purchase a challenge to get started.
              </p>

              <Link
                href="/challenges"
                className="mt-5 inline-block rounded-lg bg-green-500 px-5 py-3 font-bold text-black"
              >
                Buy Challenge
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
              {/* DESKTOP */}

              <div className="hidden overflow-x-auto md:block">
                <div className="min-w-[1050px]">
                  <div className="grid grid-cols-[1.4fr_.8fr_1fr_1fr_1fr_1fr_1fr_50px] gap-4 border-b border-zinc-800 bg-zinc-950/60 px-6 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <div>Account</div>
                    <div>Stage</div>
                    <div>Status</div>
                    <div>Balance</div>
                    <div>Equity</div>
                    <div>Profit</div>
                    <div>Withdrawable</div>
                    <div></div>
                  </div>

                  {challenges.map((challenge) => (
                    <Link
                      key={challenge.id}
                      href={`/dashboard/accounts/${challenge.id}`}
                      className="grid grid-cols-[1.4fr_.8fr_1fr_1fr_1fr_1fr_1fr_50px] items-center gap-4 border-b border-zinc-800 px-6 py-5 transition last:border-b-0 hover:bg-zinc-800/60"
                    >
                      <div>
                        <p className="font-bold">
                          {challenge.account}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {getAccountType(
                            challenge
                          )}
                        </p>

                        {challenge.mt5Login && (
                          <p className="mt-1 text-xs text-gray-600">
                            MT5{" "}
                            {challenge.mt5Login}
                          </p>
                        )}
                      </div>

                      <div>
                        <span className="inline-flex rounded-full bg-zinc-800 px-3 py-1 text-xs font-semibold text-gray-300">
                          {getStage(challenge)}
                        </span>
                      </div>

                      <div>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
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

                      <div>
                        <p className="font-semibold">
                          {money(
                            challenge.currentBalance
                          )}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          Start{" "}
                          {money(
                            challenge.startingBalance
                          )}
                        </p>
                      </div>

                      <div className="font-semibold">
                        {money(
                          challenge.currentEquity
                        )}
                      </div>

                      <div
                        className={`font-semibold ${
                          challenge.profit >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {money(challenge.profit)}
                      </div>

                      <div className="font-semibold text-green-400">
                        {money(
                          challenge.withdrawableProfit
                        )}
                      </div>

                      <div className="text-right text-xl text-gray-500">
                        →
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* MOBILE */}

              <div className="divide-y divide-zinc-800 md:hidden">
                {challenges.map((challenge) => (
                  <Link
                    key={challenge.id}
                    href={`/dashboard/accounts/${challenge.id}`}
                    className="block p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-bold">
                          {challenge.account}
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          {getAccountType(
                            challenge
                          )}
                        </p>

                        <p className="mt-2 text-xs font-semibold text-gray-300">
                          {getStage(challenge)}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
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

                    <div className="mt-5 grid grid-cols-2 gap-4">
                      <MobileStat
                        label="Balance"
                        value={money(
                          challenge.currentBalance
                        )}
                      />

                      <MobileStat
                        label="Equity"
                        value={money(
                          challenge.currentEquity
                        )}
                      />

                      <MobileStat
                        label="Profit"
                        value={money(
                          challenge.profit
                        )}
                        className={
                          challenge.profit >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }
                      />

                      <MobileStat
                        label="Withdrawable"
                        value={money(
                          challenge.withdrawableProfit
                        )}
                        className="text-green-400"
                      />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  positive = false,
  negative = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-sm text-gray-500">
        {label}
      </p>

      <p
        className={`mt-2 text-2xl font-bold ${
          positive
            ? "text-green-400"
            : negative
            ? "text-red-400"
            : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function AccountStat({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="bg-zinc-900 p-6">
      <p className="text-sm text-gray-500">
        {label}
      </p>

      <p
        className={`mt-2 text-xl font-bold ${className}`}
      >
        {value}
      </p>
    </div>
  );
}

function MobileStat({
  label,
  value,
  className = "text-white",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500">
        {label}
      </p>

      <p
        className={`mt-1 font-semibold ${className}`}
      >
        {value}
      </p>
    </div>
  );
}