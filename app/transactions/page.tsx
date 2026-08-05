"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";

type Transaction = {
  id: string;
  txRef: string;
  amount: number;
  currency: string;
  status: string;
  accountSize: string;
  challengeType: string;
  paymentMethod: string | null;
  createdAt: string;
};

function getStatusStyle(status: string) {
  if (status === "SUCCESS" || status === "SUCCESSFUL") {
    return "bg-green-500/10 text-green-400";
  }

  if (status === "FAILED") {
    return "bg-red-500/10 text-red-400";
  }

  return "bg-yellow-500/10 text-yellow-400";
}

function getPaymentMethod(method: string | null) {
  if (!method) return "Payment";

  if (method === "CRYPTO") return "Crypto";
  if (method === "FLUTTERWAVE") return "Card / Bank";

  return method;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTransactions() {
      try {
        const response = await fetch("/api/transactions", {
          cache: "no-store",
        });

        const data = await response.json();

        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }

        if (response.ok) {
          setTransactions(data.transactions || []);
        }
      } catch (error) {
        console.error("Transactions error:", error);
      } finally {
        setLoading(false);
      }
    }

    loadTransactions();
  }, []);

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      {/* HEADER */}
      <section className="border-b border-zinc-900">
        <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-500 sm:text-sm">
                Mivo Capital
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Transactions
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-gray-400 sm:mt-3 sm:text-base">
                View your challenge purchases and payment
                history.
              </p>
            </div>

            <Link
              href="/dashboard"
              className="w-full rounded-xl border border-zinc-700 px-4 py-3 text-center text-sm font-bold transition hover:border-green-500 hover:text-green-400 sm:w-auto sm:px-5"
            >
              ← Dashboard
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        {loading ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center text-sm text-gray-400 sm:p-10">
            Loading transactions...
          </div>
        ) : transactions.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-5 py-10 text-center sm:p-12">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-xl font-bold text-green-500">
              $
            </div>

            <h2 className="mt-4 text-xl font-bold sm:text-2xl">
              No Transactions Yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-400">
              Your challenge purchases and payments will appear
              here.
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
            {/* MOBILE TRANSACTIONS */}
            <div className="space-y-3 md:hidden">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                          {getPaymentMethod(
                            transaction.paymentMethod
                          )}
                        </p>

                        <p className="mt-1 text-2xl font-black text-white">
                          $
                          {Number(
                            transaction.amount
                          ).toFixed(2)}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${getStatusStyle(
                          transaction.status
                        )}`}
                      >
                        {transaction.status}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <TransactionInfo
                        label="Account"
                        value={transaction.accountSize}
                      />

                      <TransactionInfo
                        label="Program"
                        value={transaction.challengeType}
                      />
                    </div>
                  </div>

                  <div className="border-t border-zinc-800 bg-black/40 px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[9px] uppercase tracking-wider text-gray-600">
                          Reference
                        </p>

                        <p className="mt-1 truncate text-[11px] font-semibold text-gray-400">
                          {transaction.txRef}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-[9px] uppercase tracking-wider text-gray-600">
                          Date
                        </p>

                        <p className="mt-1 text-[11px] font-semibold text-gray-400">
                          {new Date(
                            transaction.createdAt
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 md:block">
              <div className="overflow-x-auto">
                <div className="min-w-[900px]">
                  <div className="grid grid-cols-[1.2fr_1fr_1.2fr_1fr_1fr_1fr] gap-4 border-b border-zinc-800 bg-black px-6 py-4 text-xs font-bold uppercase text-gray-500">
                    <div>Reference</div>
                    <div>Account</div>
                    <div>Program</div>
                    <div>Amount</div>
                    <div>Status</div>
                    <div>Date</div>
                  </div>

                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="grid grid-cols-[1.2fr_1fr_1.2fr_1fr_1fr_1fr] items-center gap-4 border-b border-zinc-800 px-6 py-5 last:border-0"
                    >
                      <div className="truncate text-sm font-semibold">
                        {transaction.txRef}
                      </div>

                      <div>{transaction.accountSize}</div>

                      <div className="text-gray-300">
                        {transaction.challengeType}
                      </div>

                      <div className="font-bold">
                        $
                        {Number(transaction.amount).toFixed(
                          2
                        )}
                      </div>

                      <div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusStyle(
                            transaction.status
                          )}`}
                        >
                          {transaction.status}
                        </span>
                      </div>

                      <div className="text-sm text-gray-400">
                        {new Date(
                          transaction.createdAt
                        ).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function TransactionInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-black p-3">
      <p className="text-[9px] uppercase tracking-wider text-gray-600">
        {label}
      </p>

      <p className="mt-1.5 line-clamp-2 text-xs font-bold leading-5 text-gray-200">
        {value}
      </p>
    </div>
  );
}