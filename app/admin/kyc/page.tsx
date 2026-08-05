"use client";

import { useEffect, useState } from "react";

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
      const response = await fetch(
        "/api/admin/kyc",
        {
          cache: "no-store",
        }
      );

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
      console.error(
        "KYC LOAD ERROR:",
        error
      );

      alert(
        "Failed to load KYC submissions."
      );
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

      if (reason === null) {
        return;
      }

      if (!reason.trim()) {
        alert(
          "Please enter a rejection reason."
        );
        return;
      }

      adminNote = reason.trim();
    }

    try {
      setUpdatingId(kycId);

      const response = await fetch(
        "/api/admin/kyc",
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            kycId,
            status,
            adminNote,
          }),
        }
      );

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
      console.error(
        "KYC UPDATE ERROR:",
        error
      );

      alert(
        "Failed to update KYC."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-4xl font-bold text-green-500">
          KYC
        </h1>

        <p className="mt-6 text-gray-400">
          Loading KYC submissions...
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-4xl font-bold text-green-500">
        KYC Management
      </h1>

      <p className="mt-2 text-gray-400">
        Review trader identity verification
        submissions.
      </p>

      {kycs.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-gray-400">
          No KYC submissions yet.
        </div>
      ) : (
        <div className="mt-10 space-y-5">
          {kycs.map((kyc) => (
            <div
              key={kyc.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <p className="text-lg font-bold">
                    {kyc.user.email}
                  </p>

                  <p className="mt-2 text-sm text-gray-500">
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

              {kyc.adminNote && (
                <div className="mt-5 rounded-xl bg-black p-4">
                  <p className="text-xs text-gray-500">
                    Admin Note
                  </p>

                  <p className="mt-2 text-sm">
                    {kyc.adminNote}
                  </p>
                </div>
              )}

              {kyc.status === "PENDING" && (
                <div className="mt-6 flex flex-wrap gap-3">
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
                    className="rounded-xl bg-green-500 px-5 py-3 font-bold text-black disabled:opacity-50"
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
                    className="rounded-xl bg-red-500 px-5 py-3 font-bold text-white disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
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
        Approved
      </span>
    );
  }

  if (status === "REJECTED") {
    return (
      <span className="rounded-full bg-red-500/20 px-4 py-2 text-sm font-bold text-red-400">
        Rejected
      </span>
    );
  }

  return (
    <span className="rounded-full bg-yellow-500/20 px-4 py-2 text-sm font-bold text-yellow-400">
      Pending
    </span>
  );
}