"use client";

import { useEffect, useState } from "react";

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
        const response = await fetch("/api/kyc");

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

      // Upload required documents
      const idFrontUrl = await uploadFile(idFront);
      const selfieUrl = await uploadFile(selfie);

      // Upload optional documents
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
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-gray-400">
          Loading KYC...
        </p>
      </main>
    );
  }

  // User already submitted KYC
  if (existingKYC) {
    return (
      <main className="min-h-screen bg-black text-white p-10">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-4xl font-bold text-green-500">
            KYC Verification
          </h1>

          <div className="mt-10 rounded-2xl border border-gray-800 bg-gray-900 p-8">
            <p className="text-gray-400">
              Verification Status
            </p>

            {existingKYC.status === "PENDING" && (
              <h2 className="mt-3 text-2xl font-bold text-yellow-400">
                🟡 Pending Review
              </h2>
            )}

            {existingKYC.status === "APPROVED" && (
              <h2 className="mt-3 text-2xl font-bold text-green-400">
                🟢 Verified
              </h2>
            )}

            {existingKYC.status === "REJECTED" && (
              <>
                <h2 className="mt-3 text-2xl font-bold text-red-400">
                  🔴 Verification Rejected
                </h2>

                {existingKYC.adminNote && (
                  <div className="mt-6 rounded-xl bg-red-500/10 p-4">
                    <p className="text-sm text-gray-400">
                      Reason
                    </p>

                    <p className="mt-1 text-red-300">
                      {existingKYC.adminNote}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-bold text-green-500">
          KYC Verification
        </h1>

        <p className="mt-2 text-gray-400">
          Complete your identity verification.
        </p>

        <div className="mt-10 space-y-6 rounded-2xl border border-gray-800 bg-gray-900 p-8">
          <div>
            <label className="mb-2 block text-sm text-gray-400">
              Full Name *
            </label>

            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl bg-gray-800 p-4 outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Your full legal name"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-400">
              Date of Birth *
            </label>

            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full rounded-xl bg-gray-800 p-4 outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-400">
              Nationality *
            </label>

            <input
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              className="w-full rounded-xl bg-gray-800 p-4 outline-none focus:ring-2 focus:ring-green-500"
              placeholder="e.g. Nigerian"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-400">
              ID Type *
            </label>

            <select
              value={idType}
              onChange={(e) => setIdType(e.target.value)}
              className="w-full rounded-xl bg-gray-800 p-4 outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">
                Select ID Type
              </option>

              <option value="NATIONAL_ID">
                National ID
              </option>

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
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-400">
              ID Number *
            </label>

            <input
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              className="w-full rounded-xl bg-gray-800 p-4 outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter ID number"
            />
          </div>

          <DocumentUpload
            title="ID Front *"
            file={idFront}
            setFile={setIdFront}
          />

          <DocumentUpload
            title="ID Back"
            file={idBack}
            setFile={setIdBack}
          />

          <DocumentUpload
            title="Selfie *"
            file={selfie}
            setFile={setSelfie}
          />

          <DocumentUpload
            title="Proof of Address"
            file={proofOfAddress}
            setFile={setProofOfAddress}
          />

          <p className="text-sm text-gray-500">
            JPG, PNG or WEBP. Maximum file size: 5MB.
          </p>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full rounded-xl bg-green-500 py-4 font-bold text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Uploading & Submitting..."
              : "Submit KYC"}
          </button>
        </div>
      </div>
    </main>
  );
}

function DocumentUpload({
  title,
  file,
  setFile,
}: {
  title: string;
  file: File | null;
  setFile: (file: File | null) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm text-gray-400">
        {title}
      </label>

      <label className="block cursor-pointer rounded-xl border border-dashed border-gray-700 bg-gray-800 p-5 transition hover:border-green-500">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) =>
            setFile(e.target.files?.[0] ?? null)
          }
        />

        <span className="text-gray-300">
          {file ? file.name : "Choose image"}
        </span>
      </label>
    </div>
  );
}