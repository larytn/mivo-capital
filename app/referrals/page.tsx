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

    await navigator.clipboard.writeText(referralLink);

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  }

  return (
    <main className="min-h-screen bg-black px-5 py-10 text-white md:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-500">
              Mivo Capital
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Referral Program
            </h1>

            <p className="mt-3 text-gray-400">
              Invite traders to Mivo Capital and earn rewards.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-lg border border-zinc-700 px-5 py-3 text-sm font-bold transition hover:border-green-500 hover:text-green-400"
          >
            ← Dashboard
          </Link>
        </div>

        {/* STATS */}
        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Referrals"
            value={loading ? "..." : String(totalReferrals)}
          />

          <StatCard
            label="Successful Referrals"
            value="0"
          />

          <StatCard
            label="Total Earnings"
            value="$0.00"
          />

          <StatCard
            label="Available Earnings"
            value="$0.00"
          />
        </section>

        {/* REFERRAL LINK */}
        <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6 md:p-8">
          <p className="text-sm font-bold uppercase tracking-wider text-green-500">
            Your Referral Link
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            Invite Traders
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
            Share your unique referral link. Traders who create
            their account through your link will automatically
            be connected to you.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              value={
                loading
                  ? "Loading referral link..."
                  : referralLink ||
                    "Referral code not available"
              }
              readOnly
              className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-black px-4 py-4 text-sm text-gray-300 outline-none"
            />

            <button
              type="button"
              onClick={copyLink}
              disabled={!referralLink}
              className="rounded-xl bg-green-500 px-7 py-4 font-bold text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
        </section>

        {/* INFO */}
        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-sm text-gray-500">
              Referral Commission
            </p>

            <p className="mt-2 text-4xl font-black text-green-500">
              Coming Soon
            </p>

            <p className="mt-3 text-sm leading-6 text-gray-400">
              Commission rates and referral reward tiers will
              appear here once the Mivo Capital referral reward
              structure is activated.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-sm text-gray-500">
              Your Referral Code
            </p>

            <p className="mt-2 text-2xl font-bold text-green-400">
              {loading
                ? "Loading..."
                : referralCode || "Not Available"}
            </p>

            <p className="mt-3 text-sm leading-6 text-gray-400">
              This unique code identifies traders who register
              through your referral link.
            </p>
          </div>
        </section>

        {/* HISTORY */}
        <section className="mt-8 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
          <div className="border-b border-zinc-800 p-6">
            <h2 className="text-xl font-bold">
              Referral History
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Traders who registered through your referral link.
            </p>
          </div>

          {loading ? (
            <div className="p-10 text-center text-gray-500">
              Loading referrals...
            </div>
          ) : referrals.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-bold">
                No Referrals Yet
              </p>

              <p className="mt-2 text-sm text-gray-500">
                Copy your referral link and start inviting
                traders.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {referrals.map((referral) => (
                <div
                  key={referral.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-6 py-5"
                >
                  <div>
                    <p className="font-bold">
                      {referral.name}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      Joined Mivo Capital
                    </p>
                  </div>

                  <p className="text-sm text-gray-500">
                    {new Date(
                      referral.createdAt
                    ).toLocaleDateString()}
                  </p>
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
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-sm text-gray-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold">
        {value}
      </p>
    </div>
  );
}