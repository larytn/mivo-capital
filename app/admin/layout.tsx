"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    try {
      setLoggingOut(true);

      const response = await fetch("/api/logout", {
        method: "POST",
      });

      if (!response.ok) {
        alert("Failed to logout.");
        return;
      }

      router.push("/admin/login");
      router.refresh();
    } catch (error) {
      console.error("Admin logout error:", error);
      alert("Failed to logout.");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-black text-white">
      <aside className="flex w-72 flex-col border-r border-zinc-800 bg-zinc-950">
        {/* HEADER */}

        <div className="border-b border-zinc-800 p-6">
          <h1 className="text-3xl font-bold text-green-500">
            Mivo Admin
          </h1>

          <p className="mt-2 text-sm text-gray-400">
            Control Center
          </p>
        </div>

        {/* NAVIGATION */}

        <nav className="flex-1 space-y-2 p-6">
          <Link
            href="/admin"
            className="block rounded-lg px-4 py-3 transition hover:bg-zinc-800"
          >
            📊 Dashboard
          </Link>

          <Link
            href="/admin/challenges"
            className="block rounded-lg px-4 py-3 transition hover:bg-zinc-800"
          >
            📈 Challenges
          </Link>

          <Link
            href="/admin/users"
            className="block rounded-lg px-4 py-3 transition hover:bg-zinc-800"
          >
            👥 Users
          </Link>

          <Link
            href="/admin/payments"
            className="block rounded-lg px-4 py-3 transition hover:bg-zinc-800"
          >
            💳 Payments
          </Link>

          <Link
            href="/admin/withdrawals"
            className="block rounded-lg px-4 py-3 transition hover:bg-zinc-800"
          >
            💰 Withdrawals
          </Link>

          <Link
            href="/admin/kyc"
            className="block rounded-lg px-4 py-3 transition hover:bg-zinc-800"
          >
            🪪 KYC Verification
          </Link>

          <Link
            href="/admin/support"
            className="block rounded-lg px-4 py-3 transition hover:bg-zinc-800"
          >
            🎧 Support
          </Link>

          <Link
            href="/admin/promos"
            className="block rounded-lg px-4 py-3 transition hover:bg-zinc-800"
          >
            🏷️ Promo Codes
          </Link>
        </nav>

        {/* BOTTOM */}

        <div className="space-y-3 border-t border-zinc-800 p-6">
          <Link
            href="/dashboard"
            className="block rounded-lg border border-zinc-700 px-4 py-3 text-center text-sm font-bold transition hover:border-green-500 hover:text-green-400"
          >
            Trader Dashboard
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full rounded-lg bg-red-500/10 px-4 py-3 font-bold text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
          >
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </aside>

      {/* PAGE CONTENT */}

      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}