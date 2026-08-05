"use client";

import { useEffect, useState } from "react";

type KYC = {
  id: string;
  fullName: string;
  dateOfBirth: string;
  nationality: string;
  idType: string;
  idNumber: string;

  idFrontUrl: string;
  idBackUrl: string | null;
  selfieUrl: string;
  proofOfAddress: string | null;

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
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadKYC = async () => {
    try {
      const response = await fetch("/api/admin/kyc", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to load KYC submissions.");
        return;
      }

      setKycs(data.kycs || []);
    } catch (error) {
      console.error(error);
      alert("Failed to load KYC submissions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKYC();
  }, []);

  const updateKYC = async (
    kycId: string,
    status: "APPROVED" | "REJECTED"
  ) => {
    let adminNote = "";

    if (status === "REJECTED") {
      const reason = window.prompt(
        "Enter the reason for rejecting this KYC:"
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
        alert(data.error || "Failed to update KYC.");
        return;
      }

      alert(
        status === "APPROVED"
          ? "KYC approved successfully!"
          : "KYC rejected."
      );

      await loadKYC();
    } catch (error) {
      console.error(error);
      alert("Failed to update KYC.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white p-10">
        <h1 className="text-4xl font-bold text-green-500">
          KYC Verification
        </h1>

        <p className="mt-6 text-gray-400">
          Loading submissions...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-10">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-4xl font-bold text-green-500">
          KYC Verification
        </h1>

        <p className="mt-2 text-gray-400">
          Review trader identity verification submissions.
        </p>

        {kycs.length === 0 ? (
          <div className="mt-10 rounded-2xl bg-gray-900 p-8">
            <p className="text-gray-400">
              No KYC submissions yet.
            </p>
          </div>
        ) : (
          <div className="mt-10 space-y-8">
            {kycs.map((kyc) => (
              <div
                key={kyc.id}
                className="rounded-2xl border border-gray-800 bg-gray-900 p-8"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold">
                      {kyc.fullName}
                    </h2>

                    <p className="mt-1 text-gray-400">
                      {kyc.user.email}
                    </p>
                  </div>

                  <StatusBadge status={kyc.status} />
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Info
                    title="Nationality"
                    value={kyc.nationality}
                  />

                  <Info
                    title="Date of Birth"
                    value={new Date(
                      kyc.dateOfBirth
                    ).toLocaleDateString()}
                  />

                  <Info
                    title="ID Type"
                    value={kyc.idType}
                  />

                  <Info
                    title="ID Number"
                    value={kyc.idNumber}
                  />
                </div>

                <h3 className="mt-10 text-xl font-bold">
                  Documents
                </h3>

                <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <DocumentLink
                    title="ID Front"
                    url={kyc.idFrontUrl}
                  />

                  {kyc.idBackUrl && (
                    <DocumentLink
                      title="ID Back"
                      url={kyc.idBackUrl}
                    />
                  )}

                  <DocumentLink
                    title="Selfie"
                    url={kyc.selfieUrl}
                  />

                  {kyc.proofOfAddress && (
                    <DocumentLink
                      title="Proof of Address"
                      url={kyc.proofOfAddress}
                    />
                  )}
                </div>

                {kyc.adminNote && (
                  <div className="mt-8 rounded-xl bg-gray-800 p-5">
                    <p className="text-sm text-gray-400">
                      Admin Note
                    </p>

                    <p className="mt-2">
                      {kyc.adminNote}
                    </p>
                  </div>
                )}

                {kyc.status === "PENDING" && (
                  <div className="mt-8 flex flex-wrap gap-4">
                    <button
                      disabled={updatingId === kyc.id}
                      onClick={() =>
                        updateKYC(kyc.id, "APPROVED")
                      }
                      className="rounded-xl bg-green-500 px-6 py-3 font-bold text-black disabled:opacity-50"
                    >
                      {updatingId === kyc.id
                        ? "Processing..."
                        : "Approve KYC"}
                    </button>

                    <button
                      disabled={updatingId === kyc.id}
                      onClick={() =>
                        updateKYC(kyc.id, "REJECTED")
                      }
                      className="rounded-xl bg-red-500 px-6 py-3 font-bold text-white disabled:opacity-50"
                    >
                      Reject KYC
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

      <p className="mt-1 font-semibold">
        {value}
      </p>
    </div>
  );
}

function DocumentLink({
  title,
  url,
}: {
  title: string;
  url: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-xl border border-gray-700 bg-gray-800 p-5 transition hover:border-green-500"
    >
      <p className="font-semibold">
        {title}
      </p>

      <p className="mt-2 text-sm text-green-400">
        View Document →
      </p>
    </a>
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

  return (
    <span className="rounded-full bg-yellow-500/20 px-4 py-2 text-sm font-bold text-yellow-400">
      🟡 Pending
    </span>
  );
}