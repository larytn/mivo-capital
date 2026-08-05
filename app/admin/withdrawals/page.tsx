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

  const loadWithdrawals = async () => {
    try {
      const response = await fetch("/api/admin/withdrawals", {
        cache: "no-store",
      });

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
  };

  useEffect(() => {
    loadWithdrawals();
  }, []);

  const updateStatus = async (
    withdrawalId: string,
    status: "APPROVED" | "REJECTED" | "PAID"
  ) => {
    let adminNote = "";

    if (status === "REJECTED") {
      const reason = window.prompt(
        "Enter the reason for rejecting this withdrawal:"
      );

      if (reason === null) {
        return;
      }

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

      if (!confirmed) {
        return;
      }
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

      alert("Withdrawal updated successfully!");

      await loadWithdrawals();
    } catch (error) {
      console.error(error);
      alert("Something went wrong.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black p-10 text-white">
        <h1 className="text-4xl font-bold text-green-500">
          Withdrawals
        </h1>

        <p className="mt-6 text-gray-400">
          Loading withdrawal requests...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black p-10 text-white">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-4xl font-bold text-green-500">
          Withdrawal Management
        </h1>

        <p className="mt-2 text-gray-400">
          Review and manage trader payout requests.
        </p>

        {withdrawals.length === 0 ? (
          <div className="mt-10 rounded-2xl bg-gray-900 p-8 text-gray-400">
            No withdrawal requests yet.
          </div>
        ) : (
          <div className="mt-10 space-y-6">
            {withdrawals.map((withdrawal) => (
              <div
                key={withdrawal.id}
                className="rounded-2xl border border-gray-800 bg-gray-900 p-8"
              >
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div>
                    <h2 className="text-3xl font-bold text-green-500">
                      ${withdrawal.amount.toLocaleString()}
                    </h2>

                    <p className="mt-2 font-semibold">
                      {withdrawal.user.name}
                    </p>

                    <p className="text-sm text-gray-400">
                      {withdrawal.user.email}
                    </p>

                    <p className="mt-2 text-sm text-gray-500">
                      {new Date(
                        withdrawal.createdAt
                      ).toLocaleString()}
                    </p>
                  </div>

                  <StatusBadge status={withdrawal.status} />
                </div>

                <div className="mt-8">
                  <p className="text-sm text-gray-400">
                    Payout Method
                  </p>

                  <p className="mt-1 text-lg font-semibold">
                    {withdrawal.method === "BANK"
                      ? "Bank Transfer"
                      : "Crypto"}
                  </p>
                </div>

                {withdrawal.method === "BANK" && (
                  <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <Info
                      title="Account Name"
                      value={withdrawal.accountName || "-"}
                    />

                    <Info
                      title="Account Number"
                      value={withdrawal.accountNumber || "-"}
                    />

                    <Info
                      title="Bank"
                      value={withdrawal.bankName || "-"}
                    />
                  </div>
                )}

                {withdrawal.method === "CRYPTO" && (
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <Info
                      title="Network"
                      value={withdrawal.cryptoNetwork || "-"}
                    />

                    <Info
                      title="Wallet Address"
                      value={withdrawal.walletAddress || "-"}
                    />
                  </div>
                )}

                {withdrawal.adminNote && (
                  <div className="mt-6 rounded-xl bg-gray-800 p-5">
                    <p className="text-sm text-gray-400">
                      Admin Note
                    </p>

                    <p className="mt-2">
                      {withdrawal.adminNote}
                    </p>
                  </div>
                )}

                {withdrawal.status === "PENDING" && (
                  <div className="mt-8 flex flex-wrap gap-4">
                    <button
                      disabled={updatingId === withdrawal.id}
                      onClick={() =>
                        updateStatus(
                          withdrawal.id,
                          "APPROVED"
                        )
                      }
                      className="rounded-xl bg-green-500 px-6 py-3 font-bold text-black disabled:opacity-50"
                    >
                      Approve
                    </button>

                    <button
                      disabled={updatingId === withdrawal.id}
                      onClick={() =>
                        updateStatus(
                          withdrawal.id,
                          "REJECTED"
                        )
                      }
                      className="rounded-xl bg-red-500 px-6 py-3 font-bold text-white disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}

                {withdrawal.status === "APPROVED" && (
                  <div className="mt-8">
                    <button
                      disabled={updatingId === withdrawal.id}
                      onClick={() =>
                        updateStatus(
                          withdrawal.id,
                          "PAID"
                        )
                      }
                      className="rounded-xl bg-purple-500 px-6 py-3 font-bold text-white disabled:opacity-50"
                    >
                      {updatingId === withdrawal.id
                        ? "Processing..."
                        : "Mark as Paid"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
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
    <div className="rounded-xl bg-gray-800 p-4">
      <p className="text-sm text-gray-400">
        {title}
      </p>

      <p className="mt-1 break-all font-semibold">
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
  if (status === "APPROVED") {
    return (
      <span className="rounded-full bg-green-500/20 px-4 py-2 text-sm font-bold text-green-400">
        🟢 Approved
      </span>
    );
  }

  if (status === "REJECTED") {
    return (
      <span className="rounded-full bg-red-500/20 px-4 py-2 text-sm font-bold text-red-400">
        🔴 Rejected
      </span>
    );
  }

  if (status === "PAID") {
    return (
      <span className="rounded-full bg-purple-500/20 px-4 py-2 text-sm font-bold text-purple-400">
        🟣 Paid
      </span>
    );
  }

  return (
    <span className="rounded-full bg-yellow-500/20 px-4 py-2 text-sm font-bold text-yellow-400">
      🟡 Pending
    </span>
  );
}