"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Referral = {
  id: string;
  name: string;
  createdAt: string;
};

export default function ReferralsPage() {
  const [referralCode, setReferralCode] = useState("");
  const [referralLink, setReferralLink] = useState("");
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReferrals() {
      try {
        const response = await fetch("/api/referrals", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            window.location.href = "/login";
          }

          return;
        }

        setReferralCode(data.referralCode || "");
        setTotalReferrals(data.totalReferrals || 0);
        setReferrals(data.referrals || []);

        if (data.referralCode) {
          setReferralLink(
            `${window.location.origin}/signup?ref=${data.referralCode}`
          );
        }
      } catch (error) {
        console.error("Failed to load referrals:", error);
      } finally {
        setLoading(false);
      }
    }

    loadReferrals();
  }, []);

  async function copyLink() {
    if (!referralLink) return;

    try {
      await navigator.clipboard.writeText(referralLink);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">

      {/* HEADER */}
      <section className="border-b border-zinc-900">
        <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-500 sm:text-sm">
                Mivo Capital
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Referral Program
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-gray-400 sm:mt-3 sm:text-base">
                Invite traders to Mivo Capital and grow your
                referral network.
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

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        {/* STATS */}
        <section className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label="Total Referrals"
            value={loading ? "..." : String(totalReferrals)}
            highlight
          />

          <StatCard
            label="Successful"
            value="0"
          />

          <StatCard
            label="Total Earnings"
            value="$0.00"
          />

          <StatCard
            label="Available"
            value="$0.00"
          />
        </section>

        {/* REFERRAL LINK */}
        <section className="mt-6 overflow-hidden rounded-2xl border border-green-500/20 bg-zinc-950 sm:mt-8">
          <div className="p-4 sm:p-7">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-500 sm:text-xs">
              Your Referral Link
            </p>

            <h2 className="mt-2 text-xl font-black sm:text-2xl">
              Invite Traders
            </h2>

            <p className="mt-2 max-w-2xl text-xs leading-5 text-gray-400 sm:text-sm sm:leading-6">
              Share your unique link. Traders who register
              through it will automatically be connected to
              your referral account.
            </p>

            <div className="mt-5 rounded-xl border border-zinc-800 bg-black p-3 sm:p-4">
              <p className="text-[9px] font-bold uppercase tracking-wider text-gray-600 sm:text-xs">
                Referral Link
              </p>

              <p className="mt-2 break-all text-xs leading-5 text-gray-300 sm:text-sm">
                {loading
                  ? "Loading referral link..."
                  : referralLink ||
                    "Referral code not available"}
              </p>
            </div>

            <button
              type="button"
              onClick={copyLink}
              disabled={!referralLink}
              className="mt-3 w-full rounded-xl bg-green-500 px-5 py-3.5 text-sm font-bold text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-7"
            >
              {copied ? "Link Copied!" : "Copy Referral Link"}
            </button>
          </div>
        </section>

        {/* REFERRAL INFO */}
        <section className="mt-5 grid grid-cols-2 gap-2.5 sm:mt-6 sm:gap-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6">
            <p className="text-[10px] text-gray-500 sm:text-sm">
              Referral Commission
            </p>

            <p className="mt-2 text-lg font-black text-green-500 sm:text-3xl">
              Coming Soon
            </p>

            <p className="mt-2 hidden text-sm leading-6 text-gray-400 sm:block">
              Commission rates and referral reward tiers will
              appear here once the Mivo Capital referral
              structure is activated.
            </p>
          </div>

          <div className="min-w-0 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6">
            <p className="text-[10px] text-gray-500 sm:text-sm">
              Referral Code
            </p>

            <p className="mt-2 break-all text-lg font-black text-green-400 sm:text-2xl">
              {loading
                ? "..."
                : referralCode || "Not Available"}
            </p>

            <p className="mt-2 hidden text-sm leading-6 text-gray-400 sm:block">
              Your unique code identifies traders who register
              through your referral link.
            </p>
          </div>
        </section>

        {/* HISTORY */}
        <section className="mt-7 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 sm:mt-8">
          <div className="flex items-center justify-between border-b border-zinc-800 p-4 sm:p-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-500">
                Network
              </p>

              <h2 className="mt-1 text-lg font-bold sm:text-xl">
                Referral History
              </h2>

              <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                Traders registered through your link.
              </p>
            </div>

            {!loading && (
              <span className="rounded-full bg-black px-3 py-1.5 text-xs font-bold text-gray-400">
                {totalReferrals}
              </span>
            )}
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-gray-500 sm:p-10">
              Loading referrals...
            </div>
          ) : referrals.length === 0 ? (
            <div className="px-5 py-9 text-center sm:p-10">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-green-500/10 text-lg font-black text-green-500">
                +
              </div>

              <p className="mt-4 font-bold">
                No Referrals Yet
              </p>

              <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-gray-500 sm:text-sm">
                Copy your referral link above and start
                inviting traders to Mivo Capital.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {referrals.map((referral, index) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-xs font-black text-green-400 sm:h-10 sm:w-10">
                      {referral.name
                        ?.charAt(0)
                        .toUpperCase() || index + 1}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold sm:text-base">
                        {referral.name}
                      </p>

                      <p className="mt-0.5 text-[10px] text-gray-500 sm:text-xs">
                        Joined Mivo Capital
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-[10px] text-gray-500 sm:text-sm">
                      {new Date(
                        referral.createdAt
                      ).toLocaleDateString()}
                    </p>

                    <span className="mt-1 inline-block rounded-full bg-green-500/10 px-2 py-0.5 text-[9px] font-bold text-green-400">
                      Registered
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({
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
      <p className="text-[10px] leading-4 text-gray-500 sm:text-sm">
        {label}
      </p>

      <p
        className={`mt-1.5 truncate text-xl font-black sm:mt-2 sm:text-2xl ${
          highlight ? "text-green-400" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
