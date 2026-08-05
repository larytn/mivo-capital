"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
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
    <main className="min-h-screen bg-black px-5 py-10 text-white md:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-500">
              Mivo Capital
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Transactions
            </h1>

            <p className="mt-3 text-gray-400">
              View your challenge purchases and payment history.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-lg border border-zinc-700 px-5 py-3 text-sm font-bold hover:border-green-500 hover:text-green-400"
          >
            ← Dashboard
          </Link>
        </div>

        <section className="mt-10 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
          {loading ? (
            <div className="p-10 text-center text-gray-400">
              Loading transactions...
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center">
              <h2 className="text-xl font-bold">
                No Transactions Yet
              </h2>

              <p className="mt-2 text-gray-500">
                Your challenge purchases will appear here.
              </p>

              <Link
                href="/challenges"
                className="mt-5 inline-block rounded-lg bg-green-500 px-5 py-3 font-bold text-black"
              >
                Buy Challenge
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                <div className="grid grid-cols-[1.2fr_1fr_1.2fr_1fr_1fr_1fr] gap-4 border-b border-zinc-800 bg-zinc-950 px-6 py-4 text-xs font-bold uppercase text-gray-500">
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
                    <div className="text-sm font-semibold">
                      {transaction.txRef}
                    </div>

                    <div>{transaction.accountSize}</div>

                    <div className="text-gray-300">
                      {transaction.challengeType}
                    </div>

                    <div className="font-bold">
                      ${Number(transaction.amount).toFixed(2)}
                    </div>

                    <div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          transaction.status === "SUCCESSFUL"
                            ? "bg-green-500/10 text-green-400"
                            : transaction.status === "FAILED"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-yellow-500/10 text-yellow-400"
                        }`}
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
          )}
        </section>
      </div>
    </main>
  );
}