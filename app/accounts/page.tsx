"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";

type Challenge = {
  id: string;
  account: string;
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

function money(value: number) {
  return `$${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getStage(stage: string) {
  if (stage === "PHASE_1") return "Phase 1";
  if (stage === "PHASE_2") return "Phase 2";
  if (stage === "PHASE_3") return "Phase 3";
  if (stage === "FUNDED") return "Funded";

  return stage;
}

function getAccountType(type: string) {
  if (type === "THREE_STEP") return "Three-Step";
  if (type === "TWO_STEP") return "Two-Step";
  if (type === "ONE_STEP") return "One-Step";
  if (type === "INSTANT") return "Instant Funding";

  return type;
}

function getStatusStyle(status: string) {
  if (status === "ACTIVE") {
    return "bg-green-500/10 text-green-400";
  }

  if (status === "PASSED") {
    return "bg-blue-500/10 text-blue-400";
  }

  if (status === "FAILED") {
    return "bg-red-500/10 text-red-400";
  }

  return "bg-yellow-500/10 text-yellow-400";
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAccounts() {
      try {
        const response = await fetch("/api/my-challenges", {
          cache: "no-store",
        });

        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }

        const data = await response.json();

        if (response.ok) {
          setAccounts(data);
        }
      } catch (error) {
        console.error("Accounts error:", error);
      } finally {
        setLoading(false);
      }
    }

    loadAccounts();
  }, []);

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      <section className="border-b border-zinc-900">
        <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-500 sm:text-sm">
                Mivo Capital
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Trading Accounts
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-gray-400 sm:mt-3 sm:text-base">
                Manage your evaluation and funded accounts.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
              <Link
                href="/dashboard"
                className="rounded-xl border border-zinc-700 px-3 py-2.5 text-center text-xs font-bold transition hover:border-green-500 hover:text-green-400 sm:px-5 sm:py-3 sm:text-sm"
              >
                ← Dashboard
              </Link>

              <Link
                href="/challenges"
                className="rounded-xl bg-green-500 px-3 py-2.5 text-center text-xs font-bold text-black transition hover:bg-green-400 sm:px-5 sm:py-3 sm:text-sm"
              >
                Buy Challenge
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        {loading ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center text-sm text-gray-400 sm:p-10">
            Loading accounts...
          </div>
        ) : accounts.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-5 py-10 text-center sm:p-12">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-xl text-green-500">
              +
            </div>

            <h2 className="mt-4 text-xl font-bold sm:text-2xl">
              No Trading Accounts
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-400 sm:text-base">
              Purchase a challenge to get your first Mivo
              Capital trading account.
            </p>

            <Link
              href="/challenges"
              className="mt-5 inline-block rounded-xl bg-green-500 px-6 py-3 text-sm font-bold text-black transition hover:bg-green-400"
            >
              Buy Challenge
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between sm:mb-5">
              <div>
                <h2 className="text-lg font-bold sm:text-xl">
                  Your Accounts
                </h2>

                <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                  Tap an account to view full trading details.
                </p>
              </div>

              <span className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-bold text-gray-400">
                {accounts.length}{" "}
                {accounts.length === 1 ? "Account" : "Accounts"}
              </span>
            </div>

            <div className="grid gap-3 sm:gap-5 lg:grid-cols-2">
              {accounts.map((account) => (
                <Link
                  key={account.id}
                  href={`/dashboard/accounts/${account.id}`}
                  className="group overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 transition hover:border-green-500/50"
                >
                  <div className="p-4 sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-xl font-black sm:text-2xl">
                          {account.account}
                        </h2>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-zinc-900 px-2.5 py-1 text-[10px] font-semibold text-gray-300 sm:text-xs">
                            {getAccountType(account.accountType)}
                          </span>

                          <span className="rounded-full bg-zinc-900 px-2.5 py-1 text-[10px] font-semibold text-gray-300 sm:text-xs">
                            {getStage(account.stage)}
                          </span>
                        </div>

                        {account.mt5Login && (
                          <p className="mt-2.5 text-[11px] text-gray-500 sm:text-xs">
                            MT5 Login: {account.mt5Login}
                          </p>
                        )}
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold sm:px-3 sm:text-xs ${getStatusStyle(
                          account.status
                        )}`}
                      >
                        {account.status}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-2.5 sm:mt-6 sm:gap-3">
                      <AccountStat
                        label="Balance"
                        value={money(account.currentBalance)}
                      />

                      <AccountStat
                        label="Equity"
                        value={money(account.currentEquity)}
                      />

                      <AccountStat
                        label="Profit"
                        value={money(account.profit)}
                        valueClassName={
                          account.profit > 0
                            ? "text-green-400"
                            : account.profit < 0
                            ? "text-red-400"
                            : "text-white"
                        }
                      />

                      <AccountStat
                        label="Withdrawable"
                        value={money(account.withdrawableProfit)}
                        valueClassName={
                          account.withdrawableProfit > 0
                            ? "text-green-400"
                            : "text-white"
                        }
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-zinc-800 bg-black/40 px-4 py-3.5 sm:px-6 sm:py-4">
                    <span className="text-xs font-bold text-green-400 sm:text-sm">
                      View Account
                    </span>

                    <span className="text-lg text-green-400 transition group-hover:translate-x-1">
                      →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function AccountStat({
  label,
  value,
  valueClassName = "text-white",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-black p-3 sm:p-4">
      <p className="text-[10px] text-gray-500 sm:text-xs">
        {label}
      </p>

      <p
        className={`mt-1.5 text-sm font-bold sm:text-base ${valueClassName}`}
      >
        {value}
      </p>
    </div>
  );
}