"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";

type Profile = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  referralCode: string | null;
  kycStatus: string | null;
};

function getKycStatus(status: string | null) {
  if (status === "APPROVED") return "Verified";
  if (status === "PENDING") return "Pending Review";
  if (status === "REJECTED") return "Rejected";
  return "Not Verified";
}

function getKycStyle(status: string | null) {
  if (status === "APPROVED") {
    return "bg-green-500/10 text-green-400";
  }

  if (status === "PENDING") {
    return "bg-yellow-500/10 text-yellow-400";
  }

  if (status === "REJECTED") {
    return "bg-red-500/10 text-red-400";
  }

  return "bg-zinc-800 text-gray-400";
}

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
      <main className="min-h-screen bg-black text-white">
        <Navbar />

        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center text-sm text-gray-400">
            Loading profile...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      {/* HEADER */}
      <section className="border-b border-zinc-900">
        <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-500 sm:text-sm">
                Mivo Capital
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                My Profile
              </h1>

              <p className="mt-2 text-sm leading-6 text-gray-400 sm:mt-3 sm:text-base">
                Manage your Mivo Capital account information.
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

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {profile && (
          <>
            {/* PROFILE CARD */}
            <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
              <div className="p-5 sm:p-7">
                <div className="flex items-center gap-4 sm:gap-5">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-green-500 text-xl font-black text-black sm:h-16 sm:w-16 sm:text-2xl">
                    {profile.name?.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-xl font-black sm:text-2xl">
                      {profile.name}
                    </h2>

                    <p className="mt-1 truncate text-xs text-gray-400 sm:text-sm">
                      {profile.email}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-green-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-green-400 sm:px-3 sm:text-xs">
                        {profile.role}
                      </span>

                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold sm:px-3 sm:text-xs ${getKycStyle(
                          profile.kycStatus
                        )}`}
                      >
                        KYC: {getKycStatus(profile.kycStatus)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 border-t border-zinc-800 bg-black/40">
                <div className="border-r border-zinc-800 p-4 sm:p-5">
                  <p className="text-[10px] uppercase tracking-wider text-gray-600 sm:text-xs">
                    Member Since
                  </p>

                  <p className="mt-1.5 text-sm font-bold sm:text-base">
                    {new Date(
                      profile.createdAt
                    ).toLocaleDateString()}
                  </p>
                </div>

                <div className="p-4 sm:p-5">
                  <p className="text-[10px] uppercase tracking-wider text-gray-600 sm:text-xs">
                    Referral Code
                  </p>

                  <p className="mt-1.5 truncate text-sm font-bold text-green-400 sm:text-base">
                    {profile.referralCode || "Not Available"}
                  </p>
                </div>
              </div>
            </section>

            {/* ACCOUNT DETAILS */}
            <section className="mt-6">
              <div className="mb-3 sm:mb-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-500">
                  Account
                </p>

                <h2 className="mt-1 text-xl font-bold">
                  Account Details
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                <ProfileCard
                  label="Full Name"
                  value={profile.name}
                />

                <ProfileCard
                  label="Email Address"
                  value={profile.email}
                />

                <ProfileCard
                  label="Account Type"
                  value={profile.role}
                />

                <ProfileCard
                  label="KYC Status"
                  value={getKycStatus(profile.kycStatus)}
                  highlight={profile.kycStatus === "APPROVED"}
                />
              </div>
            </section>

            {/* QUICK ACTIONS */}
            <section className="mt-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:mt-8 sm:p-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-500">
                  Quick Access
                </p>

                <h2 className="mt-1 text-xl font-bold">
                  Account Actions
                </h2>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-5 sm:grid-cols-4 sm:gap-3">
                <ActionLink
                  href="/kyc"
                  title="KYC"
                  description="Verification"
                  primary={profile.kycStatus !== "APPROVED"}
                />

                <ActionLink
                  href="/referrals"
                  title="Referrals"
                  description="Invite traders"
                />

                <ActionLink
                  href="/transactions"
                  title="Transactions"
                  description="Payments"
                />

                <ActionLink
                  href="/withdrawals"
                  title="Withdrawals"
                  description="Payouts"
                />
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
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 sm:p-5">
      <p className="text-[10px] text-gray-500 sm:text-sm">
        {label}
      </p>

      <p
        className={`mt-1.5 break-words text-xs font-bold leading-5 sm:mt-2 sm:text-lg ${
          highlight ? "text-green-400" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ActionLink({
  href,
  title,
  description,
  primary = false,
}: {
  href: string;
  title: string;
  description: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-xl border p-3.5 transition sm:p-4 ${
        primary
          ? "border-green-500 bg-green-500 text-black"
          : "border-zinc-800 bg-black hover:border-green-500"
      }`}
    >
      <p className="text-xs font-bold sm:text-sm">{title}</p>

      <p
        className={`mt-1 text-[10px] sm:text-xs ${
          primary ? "text-black/70" : "text-gray-500"
        }`}
      >
        {description}
      </p>

      <p
        className={`mt-3 text-sm font-bold ${
          primary ? "text-black" : "text-green-400"
        }`}
      >
        →
      </p>
    </Link>
  );
}