"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "../../components/Navbar";

type KYCStatus = {
  status: string;
  adminNote?: string | null;
};

export default function KYCPage() {
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [nationality, setNationality] = useState("");
  const [idType, setIdType] = useState("");
  const [idNumber, setIdNumber] = useState("");

  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [proofOfAddress, setProofOfAddress] =
    useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [existingKYC, setExistingKYC] =
    useState<KYCStatus | null>(null);

  useEffect(() => {
    const loadKYC = async () => {
      try {
        const response = await fetch("/api/kyc", {
          cache: "no-store",
        });

        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (data.kyc) {
          setExistingKYC(data.kyc);
        }
      } catch (error) {
        console.error("Failed to load KYC:", error);
      } finally {
        setCheckingStatus(false);
      }
    };

    loadKYC();
  }, []);

  const uploadFile = async (file: File) => {
    const formData = new FormData();

    formData.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "File upload failed.");
    }

    return data.url as string;
  };

  const handleSubmit = async () => {
    try {
      if (
        !fullName ||
        !dateOfBirth ||
        !nationality ||
        !idType ||
        !idNumber
      ) {
        alert("Please complete all personal information.");
        return;
      }

      if (!idFront) {
        alert("Please upload the front of your ID.");
        return;
      }

      if (!selfie) {
        alert("Please upload your selfie.");
        return;
      }

      setLoading(true);

      const idFrontUrl = await uploadFile(idFront);
      const selfieUrl = await uploadFile(selfie);

      let idBackUrl: string | null = null;
      let proofOfAddressUrl: string | null = null;

      if (idBack) {
        idBackUrl = await uploadFile(idBack);
      }

      if (proofOfAddress) {
        proofOfAddressUrl = await uploadFile(proofOfAddress);
      }

      const response = await fetch("/api/kyc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          dateOfBirth,
          nationality,
          idType,
          idNumber,
          idFrontUrl,
          idBackUrl,
          selfieUrl,
          proofOfAddress: proofOfAddressUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "KYC submission failed.");
        return;
      }

      alert("KYC submitted successfully!");

      setExistingKYC({
        status: "PENDING",
      });
    } catch (error: any) {
      console.error(error);

      alert(error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <main className="min-h-screen bg-black text-white">
        <Navbar />

        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center text-sm text-gray-400">
            Loading KYC...
          </div>
        </div>
      </main>
    );
  }

  if (existingKYC) {
    return (
      <main className="min-h-screen bg-black text-white">
        <Navbar />

        <section className="border-b border-zinc-900">
          <div className="mx-auto max-w-4xl px-4 py-7 sm:px-6 sm:py-10">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-500 sm:text-sm">
                  Mivo Capital
                </p>

                <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                  KYC Verification
                </h1>

                <p className="mt-2 text-sm text-gray-400 sm:text-base">
                  Identity verification status.
                </p>
              </div>

              <Link
                href="/dashboard"
                className="w-full rounded-xl border border-zinc-700 px-4 py-3 text-center text-sm font-bold transition hover:border-green-500 hover:text-green-400 sm:w-auto"
              >
                ← Dashboard
              </Link>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
          <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
            <div className="p-5 sm:p-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 sm:text-xs">
                Verification Status
              </p>

              {existingKYC.status === "PENDING" && (
                <>
                  <div className="mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/10 text-xl">
                    ⏳
                  </div>

                  <h2 className="mt-4 text-2xl font-black text-yellow-400 sm:text-3xl">
                    Pending Review
                  </h2>

                  <p className="mt-2 max-w-xl text-sm leading-6 text-gray-400">
                    Your documents have been submitted and are
                    currently being reviewed.
                  </p>
                </>
              )}

              {existingKYC.status === "APPROVED" && (
                <>
                  <div className="mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-xl text-green-400">
                    ✓
                  </div>

                  <h2 className="mt-4 text-2xl font-black text-green-400 sm:text-3xl">
                    Verified
                  </h2>

                  <p className="mt-2 max-w-xl text-sm leading-6 text-gray-400">
                    Your identity has been successfully verified.
                    Your account is KYC approved.
                  </p>
                </>
              )}

              {existingKYC.status === "REJECTED" && (
                <>
                  <div className="mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-xl text-red-400">
                    ×
                  </div>

                  <h2 className="mt-4 text-2xl font-black text-red-400 sm:text-3xl">
                    Verification Rejected
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    Your verification could not be approved.
                  </p>

                  {existingKYC.adminNote && (
                    <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-red-400">
                        Reason
                      </p>

                      <p className="mt-2 break-words text-sm leading-6 text-red-200">
                        {existingKYC.adminNote}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="border-t border-zinc-800 bg-black/40 p-4 sm:px-8">
              <Link
                href="/dashboard"
                className="block w-full rounded-xl bg-green-500 px-5 py-3.5 text-center text-sm font-bold text-black transition hover:bg-green-400 sm:w-auto sm:inline-block"
              >
                Return to Dashboard
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      {/* HEADER */}
      <section className="border-b border-zinc-900">
        <div className="mx-auto max-w-4xl px-4 py-7 sm:px-6 sm:py-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-500 sm:text-sm">
                Mivo Capital
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                KYC Verification
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-gray-400 sm:text-base">
                Complete your identity verification to unlock
                account features and withdrawals.
              </p>
            </div>

            <Link
              href="/dashboard"
              className="w-full rounded-xl border border-zinc-700 px-4 py-3 text-center text-sm font-bold transition hover:border-green-500 hover:text-green-400 sm:w-auto"
            >
              ← Dashboard
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
        {/* INFORMATION */}
        <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
          <div className="border-b border-zinc-800 p-4 sm:p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-500">
              Step 1
            </p>

            <h2 className="mt-1 text-xl font-bold sm:text-2xl">
              Personal Information
            </h2>
          </div>

          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
            <FormField label="Full Name *">
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3.5 text-sm outline-none transition placeholder:text-gray-600 focus:border-green-500"
                placeholder="Your full legal name"
              />
            </FormField>

            <FormField label="Date of Birth *">
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3.5 text-sm outline-none transition focus:border-green-500"
              />
            </FormField>

            <FormField label="Nationality *">
              <input
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3.5 text-sm outline-none transition placeholder:text-gray-600 focus:border-green-500"
                placeholder="e.g. Nigerian"
              />
            </FormField>

            <FormField label="ID Type *">
              <select
                value={idType}
                onChange={(e) => setIdType(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3.5 text-sm outline-none transition focus:border-green-500"
              >
                <option value="">Select ID Type</option>
                <option value="NATIONAL_ID">National ID</option>
                <option value="PASSPORT">
                  International Passport
                </option>
                <option value="DRIVERS_LICENSE">
                  Driver&apos;s License
                </option>
                <option value="VOTERS_CARD">
                  Voter&apos;s Card
                </option>
              </select>
            </FormField>

            <div className="sm:col-span-2">
              <FormField label="ID Number *">
                <input
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3.5 text-sm outline-none transition placeholder:text-gray-600 focus:border-green-500"
                  placeholder="Enter ID number"
                />
              </FormField>
            </div>
          </div>
        </section>

        {/* DOCUMENTS */}
        <section className="mt-5 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 sm:mt-6">
          <div className="border-b border-zinc-800 p-4 sm:p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-500">
              Step 2
            </p>

            <h2 className="mt-1 text-xl font-bold sm:text-2xl">
              Verification Documents
            </h2>

            <p className="mt-2 text-xs leading-5 text-gray-500 sm:text-sm">
              Upload clear images. JPG, PNG or WEBP. Maximum
              file size: 5MB.
            </p>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-2 sm:gap-4 sm:p-6">
            <DocumentUpload
              title="ID Front"
              required
              description="Front side of your identity document"
              file={idFront}
              setFile={setIdFront}
            />

            <DocumentUpload
              title="ID Back"
              description="Back side, if applicable"
              file={idBack}
              setFile={setIdBack}
            />

            <DocumentUpload
              title="Selfie"
              required
              description="A clear recent photo of yourself"
              file={selfie}
              setFile={setSelfie}
            />

            <DocumentUpload
              title="Proof of Address"
              description="Utility bill or similar document"
              file={proofOfAddress}
              setFile={setProofOfAddress}
            />
          </div>
        </section>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="mt-5 w-full rounded-xl bg-green-500 px-6 py-4 text-sm font-bold text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50 sm:mt-6"
        >
          {loading
            ? "Uploading & Submitting..."
            : "Submit KYC Verification"}
        </button>

        <p className="mt-3 text-center text-[10px] leading-5 text-gray-600 sm:text-xs">
          Make sure all information and uploaded documents are
          accurate before submitting.
        </p>
      </div>
    </main>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium text-gray-400 sm:text-sm">
        {label}
      </label>

      {children}
    </div>
  );
}

function DocumentUpload({
  title,
  description,
  required = false,
  file,
  setFile,
}: {
  title: string;
  description: string;
  required?: boolean;
  file: File | null;
  setFile: (file: File | null) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-gray-400 sm:text-sm">
        {title}
        {required && (
          <span className="ml-1 text-green-500">*</span>
        )}
      </p>

      <label
        className={`block cursor-pointer rounded-xl border border-dashed p-4 transition sm:p-5 ${
          file
            ? "border-green-500/50 bg-green-500/[0.06]"
            : "border-zinc-700 bg-black hover:border-green-500"
        }`}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) =>
            setFile(e.target.files?.[0] ?? null)
          }
        />

        {file ? (
          <>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500 text-xs font-black text-black">
                ✓
              </div>

              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-green-400 sm:text-sm">
                  {file.name}
                </p>

                <p className="mt-0.5 text-[9px] text-gray-500 sm:text-[10px]">
                  Tap to replace
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs font-bold text-white sm:text-sm">
              Choose Image
            </p>

            <p className="mt-1 text-[10px] leading-4 text-gray-500 sm:text-xs">
              {description}
            </p>
          </>
        )}
      </label>
    </div>
  );
}