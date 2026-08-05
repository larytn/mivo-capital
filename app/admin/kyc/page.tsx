"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type KYC = {
  id: string;
  status: string;
  adminNote: string | null;
  createdAt: string;

  user: {
    id: string;
    email: string;
  };
};

export default function AdminKYCPage() {
  const [kycs, setKycs] = useState<KYC[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] =
    useState<string | null>(null);

  async function loadKYC() {
    try {
      const response = await fetch("/api/admin/kyc", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.error ||
            "Failed to load KYC submissions."
        );
        return;
      }

      setKycs(data.kycs || []);
    } catch (error) {
      console.error("KYC LOAD ERROR:", error);

      alert("Failed to load KYC submissions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadKYC();
  }, []);

  async function updateKYC(
    kycId: string,
    status: "APPROVED" | "REJECTED"
  ) {
    let adminNote = "";

    if (status === "REJECTED") {
      const reason = window.prompt(
        "Enter the reason for rejecting this KYC:"
      );

      if (reason === null) return;

      if (!reason.trim()) {
        alert("Please enter a rejection reason.");
        return;
      }

      adminNote = reason.trim();
    }

    try {
      setUpdatingId(kycId);

      const response = await fetch("/api/admin/kyc", {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          kycId,
          status,
          adminNote,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.error ||
            "Failed to update KYC."
        );
        return;
      }

      await loadKYC();
    } catch (error) {
      console.error("KYC UPDATE ERROR:", error);

      alert("Failed to update KYC.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6 sm:py-8 lg:px-10">
      <div className="mx-auto w-full max-w-6xl">
        {/* HEADER */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-green-500 sm:text-xs">
                Mivo Capital Admin
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                KYC Management
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                Review trader identity verification
                submissions.
              </p>
            </div>

            <Link
              href="/admin"
              className="w-full rounded-xl border border-zinc-700 px-4 py-3 text-center text-xs font-bold text-gray-300 transition hover:border-green-500 hover:text-green-400 sm:w-auto sm:text-sm"
            >
              ← Admin Dashboard
            </Link>
          </div>
        </section>

        {/* SUMMARY */}
        <section className="mt-6 grid grid-cols-3 gap-2 sm:gap-4">
          <SummaryCard
            label="Total"
            value={loading ? "..." : kycs.length}
          />

          <SummaryCard
            label="Pending"
            value={
              loading
                ? "..."
                : kycs.filter(
                    (kyc) =>
                      kyc.status === "PENDING"
                  ).length
            }
            valueClass="text-yellow-400"
          />

          <SummaryCard
            label="Approved"
            value={
              loading
                ? "..."
                : kycs.filter(
                    (kyc) =>
                      kyc.status === "APPROVED"
                  ).length
            }
            valueClass="text-green-400"
          />
        </section>

        {/* LOADING */}
        {loading ? (
          <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-10 text-center">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-[3px] border-zinc-700 border-t-green-500" />

            <p className="mt-4 text-sm text-gray-500">
              Loading KYC submissions...
            </p>
          </section>
        ) : kycs.length === 0 ? (
          /* EMPTY */
          <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-10 text-center">
            <p className="font-bold">
              No KYC Submissions
            </p>

            <p className="mt-2 text-xs text-gray-500 sm:text-sm">
              Trader verification requests will
              appear here.
            </p>
          </section>
        ) : (
          /* KYC LIST */
          <section className="mt-6 space-y-3 sm:space-y-4">
            {kycs.map((kyc) => (
              <div
                key={kyc.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6"
              >
                {/* TOP */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-all text-sm font-black sm:text-lg">
                      {kyc.user.email}
                    </p>

                    <p className="mt-1 text-[10px] text-gray-600 sm:text-xs">
                      Submitted{" "}
                      {new Date(
                        kyc.createdAt
                      ).toLocaleString()}
                    </p>
                  </div>

                  <StatusBadge
                    status={kyc.status}
                  />
                </div>

                {/* DETAILS */}
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <InfoCard
                    label="Submission ID"
                    value={kyc.id}
                  />

                  <InfoCard
                    label="Status"
                    value={
                      kyc.status === "APPROVED"
                        ? "Approved"
                        : kyc.status ===
                          "REJECTED"
                        ? "Rejected"
                        : "Pending Review"
                    }
                  />
                </div>

                {/* ADMIN NOTE */}
                {kyc.adminNote && (
                  <div className="mt-4 rounded-xl border border-zinc-800 bg-black p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-600">
                      Admin Note
                    </p>

                    <p className="mt-2 break-words text-xs leading-5 text-gray-300 sm:text-sm">
                      {kyc.adminNote}
                    </p>
                  </div>
                )}

                {/* ACTIONS */}
                {kyc.status === "PENDING" && (
                  <div className="mt-5 grid grid-cols-2 gap-3 border-t border-zinc-800 pt-5">
                    <button
                      type="button"
                      disabled={
                        updatingId === kyc.id
                      }
                      onClick={() =>
                        updateKYC(
                          kyc.id,
                          "APPROVED"
                        )
                      }
                      className="rounded-xl bg-green-500 px-3 py-3 text-xs font-black text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50 sm:px-5 sm:text-sm"
                    >
                      {updatingId === kyc.id
                        ? "Updating..."
                        : "Approve"}
                    </button>

                    <button
                      type="button"
                      disabled={
                        updatingId === kyc.id
                      }
                      onClick={() =>
                        updateKYC(
                          kyc.id,
                          "REJECTED"
                        )
                      }
                      className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-3 text-xs font-black text-red-400 transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:px-5 sm:text-sm"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  valueClass = "text-white",
}: {
  label: string;
  value: string | number;
  valueClass?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-950 p-3 sm:p-5">
      <p className="text-[9px] font-bold uppercase tracking-wide text-gray-600 sm:text-xs">
        {label}
      </p>

      <p
        className={`mt-1 text-xl font-black sm:mt-2 sm:text-2xl ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-black p-3">
      <p className="text-[9px] font-bold uppercase tracking-wide text-gray-600">
        {label}
      </p>

      <p className="mt-1 break-all text-[11px] font-bold text-gray-300 sm:text-xs">
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
      <span className="shrink-0 rounded-full bg-green-500/10 px-2.5 py-1 text-[10px] font-bold text-green-400 sm:px-3 sm:text-xs">
        Approved
      </span>
    );
  }

  if (status === "REJECTED") {
    return (
      <span className="shrink-0 rounded-full bg-red-500/10 px-2.5 py-1 text-[10px] font-bold text-red-400 sm:px-3 sm:text-xs">
        Rejected
      </span>
    );
  }

  return (
    <span className="shrink-0 rounded-full bg-yellow-500/10 px-2.5 py-1 text-[10px] font-bold text-yellow-400 sm:px-3 sm:text-xs">
      Pending
    </span>
  );
}