"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Profile = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  referralCode: string | null;
  kycStatus: string | null;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch("/api/profile", {
          cache: "no-store",
        });

        const data = await response.json();

        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }

        if (!response.ok) {
          setError(data.error || "Failed to load profile.");
          return;
        }

        setProfile(data.profile);
      } catch (error) {
        console.error(error);
        setError("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-gray-400">Loading profile...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-5 py-10 text-white md:px-10">
      <div className="mx-auto max-w-5xl">
        {/* HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-500">
              Mivo Capital
            </p>

            <h1 className="mt-2 text-4xl font-black">
              My Profile
            </h1>

            <p className="mt-3 text-gray-400">
              Manage your Mivo Capital account information.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-lg border border-zinc-700 px-5 py-3 text-sm font-bold transition hover:border-green-500 hover:text-green-400"
          >
            ← Dashboard
          </Link>
        </div>

        {error && (
          <div className="mt-8 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400">
            {error}
          </div>
        )}

        {profile && (
          <>
            {/* PROFILE CARD */}
            <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900 p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-5">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500 text-2xl font-black text-black">
                  {profile.name
                    ?.charAt(0)
                    .toUpperCase()}
                </div>

                <div>
                  <h2 className="text-2xl font-bold">
                    {profile.name}
                  </h2>

                  <p className="mt-1 text-gray-400">
                    {profile.email}
                  </p>

                  <span className="mt-3 inline-block rounded-full bg-green-500/10 px-3 py-1 text-xs font-bold text-green-400">
                    {profile.role}
                  </span>
                </div>
              </div>
            </section>

            {/* ACCOUNT DETAILS */}
            <section className="mt-6 grid gap-4 md:grid-cols-2">
              <ProfileCard
                label="Full Name"
                value={profile.name}
              />

              <ProfileCard
                label="Email Address"
                value={profile.email}
              />

              <ProfileCard
                label="Referral Code"
                value={profile.referralCode || "Not Available"}
              />

              <ProfileCard
                label="KYC Status"
                value={
                  profile.kycStatus === "APPROVED"
                    ? "Verified"
                    : profile.kycStatus === "PENDING"
                    ? "Pending Review"
                    : profile.kycStatus === "REJECTED"
                    ? "Rejected"
                    : "Not Verified"
                }
              />

              <ProfileCard
                label="Account Type"
                value={profile.role}
              />

              <ProfileCard
                label="Member Since"
                value={new Date(
                  profile.createdAt
                ).toLocaleDateString()}
              />
            </section>

            {/* QUICK ACTIONS */}
            <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="text-xl font-bold">
                Account Actions
              </h2>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/kyc"
                  className="rounded-lg bg-green-500 px-5 py-3 font-bold text-black transition hover:bg-green-400"
                >
                  KYC Verification
                </Link>

                <Link
                  href="/referrals"
                  className="rounded-lg border border-zinc-700 px-5 py-3 font-bold transition hover:border-green-500 hover:text-green-400"
                >
                  Referrals
                </Link>

                <Link
                  href="/transactions"
                  className="rounded-lg border border-zinc-700 px-5 py-3 font-bold transition hover:border-green-500 hover:text-green-400"
                >
                  Transactions
                </Link>

                <Link
                  href="/withdrawals"
                  className="rounded-lg border border-zinc-700 px-5 py-3 font-bold transition hover:border-green-500 hover:text-green-400"
                >
                  Withdrawals
                </Link>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function ProfileCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-sm text-gray-500">
        {label}
      </p>

      <p className="mt-2 break-words text-lg font-bold">
        {value}
      </p>
    </div>
  );
}