"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
    <main className="min-h-screen bg-black px-5 py-10 text-white md:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-500">
              Mivo Capital
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Trading Accounts
            </h1>

            <p className="mt-3 text-gray-400">
              Manage your evaluation and funded accounts.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg border border-zinc-700 px-5 py-3 text-sm font-bold hover:border-green-500 hover:text-green-400"
            >
              ← Dashboard
            </Link>

            <Link
              href="/challenges"
              className="rounded-lg bg-green-500 px-5 py-3 text-sm font-bold text-black hover:bg-green-400"
            >
              Buy Challenge
            </Link>
          </div>
        </div>

        <section className="mt-10">
          {loading ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-10 text-center text-gray-400">
              Loading accounts...
            </div>
          ) : accounts.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-12 text-center">
              <h2 className="text-2xl font-bold">
                No Trading Accounts
              </h2>

              <p className="mt-2 text-gray-400">
                Purchase a challenge to get your first trading account.
              </p>

              <Link
                href="/challenges"
                className="mt-6 inline-block rounded-lg bg-green-500 px-6 py-3 font-bold text-black"
              >
                Buy Challenge
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {accounts.map((account) => (
                <Link
                  key={account.id}
                  href={`/dashboard/accounts/${account.id}`}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 transition hover:border-green-500/50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold">
                        {account.account}
                      </h2>

                      <p className="mt-1 text-sm text-gray-400">
                        {getAccountType(account.accountType)} •{" "}
                        {getStage(account.stage)}
                      </p>

                      {account.mt5Login && (
                        <p className="mt-2 text-xs text-gray-500">
                          MT5 Login: {account.mt5Login}
                        </p>
                      )}
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        account.status === "ACTIVE"
                          ? "bg-green-500/10 text-green-400"
                          : account.status === "PASSED"
                          ? "bg-blue-500/10 text-blue-400"
                          : account.status === "FAILED"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-yellow-500/10 text-yellow-400"
                      }`}
                    >
                      {account.status}
                    </span>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-4">
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
                    />

                    <AccountStat
                      label="Withdrawable"
                      value={money(account.withdrawableProfit)}
                    />
                  </div>

                  <div className="mt-6 border-t border-zinc-800 pt-4 text-sm font-bold text-green-400">
                    View Account →
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function AccountStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-black p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 font-bold">{value}</p>
    </div>
  );
}