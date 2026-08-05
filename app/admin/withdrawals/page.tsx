"use client";

import { useEffect, useState } from "react";

type Withdrawal = {
  id: string;
  amount: number;
  method: string;

  accountName: string | null;
  accountNumber: string | null;
  bankName: string | null;

  cryptoNetwork: string | null;
  walletAddress: string | null;

  status: string;
  adminNote: string | null;
  createdAt: string;

  user: {
    id: string;
    name: string;
    email: string;
  };
};

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function loadWithdrawals() {
    try {
      const response = await fetch("/api/admin/withdrawals", {
        cache: "no-store",
      });

      if (response.status === 401) {
        window.location.href = "/admin/login";
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to load withdrawals.");
        return;
      }

      setWithdrawals(data.withdrawals || []);
    } catch (error) {
      console.error(error);
      alert("Failed to load withdrawals.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWithdrawals();
  }, []);

  async function updateStatus(
    withdrawalId: string,
    status: "APPROVED" | "REJECTED" | "PAID"
  ) {
    let adminNote = "";

    if (status === "REJECTED") {
      const reason = window.prompt(
        "Enter the reason for rejecting this withdrawal:"
      );

      if (reason === null) return;

      if (!reason.trim()) {
        alert("Please enter a rejection reason.");
        return;
      }

      adminNote = reason.trim();
    }

    if (status === "PAID") {
      const confirmed = window.confirm(
        "Confirm that this withdrawal has been paid?"
      );

      if (!confirmed) return;
    }

    try {
      setUpdatingId(withdrawalId);

      const response = await fetch("/api/admin/withdrawals", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          withdrawalId,
          status,
          adminNote,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to update withdrawal.");
        return;
      }

      await loadWithdrawals();
    } catch (error) {
      console.error(error);
      alert("Something went wrong.");
    } finally {
      setUpdatingId(null);
    }
  }

  const pending = withdrawals.filter(
    (item) => item.status === "PENDING"
  ).length;

  const approved = withdrawals.filter(
    (item) => item.status === "APPROVED"
  ).length;

  const paid = withdrawals.filter(
    (item) => item.status === "PAID"
  ).length;

  return (
    <div className="mx-auto w-full max-w-7xl">
      {/* HEADER */}

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-green-500 sm:text-sm">
          Mivo Capital Admin
        </p>

        <h1 className="mt-2 text-3xl font-black sm:text-4xl">
          Withdrawals
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400 sm:text-base">
          Review and manage trader payout requests.
        </p>
      </div>

      {/* STATS */}

      <section className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard
          label="Total"
          value={loading ? "..." : withdrawals.length}
        />

        <StatCard
          label="Pending"
          value={loading ? "..." : pending}
        />

        <StatCard
          label="Approved"
          value={loading ? "..." : approved}
        />

        <StatCard
          label="Paid"
          value={loading ? "..." : paid}
        />
      </section>

      {/* WITHDRAWALS */}

      <section className="mt-8">
        {loading ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center text-sm text-gray-400">
            Loading withdrawal requests...
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-10 text-center">
            <h2 className="font-bold">
              No Withdrawal Requests
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Trader payout requests will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {withdrawals.map((withdrawal) => (
              <article
                key={withdrawal.id}
                className="min-w-0 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900"
              >
                {/* TOP */}

                <div className="p-4 sm:p-6">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                        Withdrawal Amount
                      </p>

                      <h2 className="mt-1 text-2xl font-black text-green-500 sm:text-3xl">
                        $
                        {Number(withdrawal.amount).toLocaleString(
                          "en-US",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}
                      </h2>

                      <p className="mt-4 break-words font-bold text-white">
                        {withdrawal.user.name}
                      </p>

                      <p className="mt-1 break-all text-xs text-gray-400 sm:text-sm">
                        {withdrawal.user.email}
                      </p>

                      <p className="mt-2 text-xs text-gray-600">
                        {new Date(
                          withdrawal.createdAt
                        ).toLocaleString()}
                      </p>
                    </div>

                    <StatusBadge status={withdrawal.status} />
                  </div>
                </div>

                {/* METHOD */}

                <div className="border-t border-zinc-800 bg-black/30 p-4 sm:p-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Payout Method
                  </p>

                  <p className="mt-2 font-bold">
                    {withdrawal.method === "BANK"
                      ? "Bank Transfer"
                      : "Crypto"}
                  </p>

                  {withdrawal.method === "BANK" && (
                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <Info
                        title="Account Name"
                        value={withdrawal.accountName || "—"}
                      />

                      <Info
                        title="Account Number"
                        value={withdrawal.accountNumber || "—"}
                      />

                      <Info
                        title="Bank"
                        value={withdrawal.bankName || "—"}
                      />
                    </div>
                  )}

                  {withdrawal.method === "CRYPTO" && (
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <Info
                        title="Network"
                        value={withdrawal.cryptoNetwork || "—"}
                      />

                      <Info
                        title="Wallet Address"
                        value={withdrawal.walletAddress || "—"}
                      />
                    </div>
                  )}
                </div>

                {/* ADMIN NOTE */}

                {withdrawal.adminNote && (
                  <div className="border-t border-zinc-800 p-4 sm:p-6">
                    <div className="rounded-xl border border-zinc-700 bg-black p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                        Admin Note
                      </p>

                      <p className="mt-2 break-words text-sm leading-6 text-gray-300">
                        {withdrawal.adminNote}
                      </p>
                    </div>
                  </div>
                )}

                {/* ACTIONS */}

                {withdrawal.status === "PENDING" && (
                  <div className="grid gap-3 border-t border-zinc-800 p-4 sm:flex sm:p-6">
                    <button
                      type="button"
                      disabled={updatingId === withdrawal.id}
                      onClick={() =>
                        updateStatus(
                          withdrawal.id,
                          "APPROVED"
                        )
                      }
                      className="w-full rounded-xl bg-green-500 px-6 py-3 font-bold text-black transition hover:bg-green-400 disabled:opacity-50 sm:w-auto"
                    >
                      {updatingId === withdrawal.id
                        ? "Processing..."
                        : "Approve"}
                    </button>

                    <button
                      type="button"
                      disabled={updatingId === withdrawal.id}
                      onClick={() =>
                        updateStatus(
                          withdrawal.id,
                          "REJECTED"
                        )
                      }
                      className="w-full rounded-xl border border-red-500/40 bg-red-500/10 px-6 py-3 font-bold text-red-400 transition hover:bg-red-500/20 disabled:opacity-50 sm:w-auto"
                    >
                      Reject
                    </button>
                  </div>
                )}

                {withdrawal.status === "APPROVED" && (
                  <div className="border-t border-zinc-800 p-4 sm:p-6">
                    <button
                      type="button"
                      disabled={updatingId === withdrawal.id}
                      onClick={() =>
                        updateStatus(
                          withdrawal.id,
                          "PAID"
                        )
                      }
                      className="w-full rounded-xl bg-purple-500 px-6 py-3 font-bold text-white transition hover:bg-purple-400 disabled:opacity-50 sm:w-auto"
                    >
                      {updatingId === withdrawal.id
                        ? "Processing..."
                        : "Mark as Paid"}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
      <p className="text-xs text-gray-500 sm:text-sm">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black sm:text-3xl">
        {value}
      </p>
    </div>
  );
}

function Info({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <p className="text-xs text-gray-500">
        {title}
      </p>

      <p className="mt-2 break-all text-sm font-semibold text-white">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const styles: Record<string, string> = {
    PENDING: "bg-yellow-500/10 text-yellow-400",
    APPROVED: "bg-green-500/10 text-green-400",
    REJECTED: "bg-red-500/10 text-red-400",
    PAID: "bg-purple-500/10 text-purple-400",
  };

  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold sm:px-3 sm:text-xs ${
        styles[status] || "bg-zinc-800 text-gray-300"
      }`}
    >
      {status}
    </span>
  );
}