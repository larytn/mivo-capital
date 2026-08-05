import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AdminDashboard() {
  const [
    totalUsers,
    totalChallenges,
    pendingChallenges,
    activeChallenges,
    passedChallenges,
    fundedChallenges,
    revenue,
    openSupportTickets,
  ] = await Promise.all([
    prisma.user.count(),

    prisma.challenge.count(),

    prisma.challenge.count({
      where: {
        status: "PENDING",
      },
    }),

    prisma.challenge.count({
      where: {
        status: "ACTIVE",
      },
    }),

    prisma.challenge.count({
      where: {
        status: "PASSED",
      },
    }),

    prisma.challenge.count({
      where: {
        stage: "FUNDED",
      },
    }),

    prisma.challenge.aggregate({
      _sum: {
        price: true,
      },
    }),

    prisma.supportTicket.count({
      where: {
        status: "OPEN",
      },
    }),
  ]);

  const revenueAmount = Number(
    revenue._sum.price ?? 0
  ).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6 sm:py-8 lg:px-10">
      <div className="mx-auto w-full max-w-7xl">
        {/* HEADER */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-green-500 sm:text-xs">
                Mivo Capital
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Admin Dashboard
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                Mivo Capital Control Center
              </p>
            </div>

            <Link
              href="/dashboard"
              className="w-full rounded-xl border border-zinc-700 px-4 py-3 text-center text-xs font-bold text-gray-300 transition hover:border-green-500 hover:text-green-400 sm:w-auto sm:text-sm"
            >
              Trader Dashboard →
            </Link>
          </div>
        </section>

        {/* STATS */}
        <section className="mt-7 sm:mt-8">
          <div className="mb-4">
            <h2 className="text-xl font-black sm:text-2xl">
              Platform Overview
            </h2>

            <p className="mt-1 text-xs text-gray-500 sm:text-sm">
              Live overview of traders and accounts.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <Card
              title="Total Users"
              value={totalUsers}
            />

            <Card
              title="Challenges"
              value={totalChallenges}
            />

            <Card
              title="Pending"
              value={pendingChallenges}
              valueClass="text-yellow-400"
            />

            <Card
              title="Active"
              value={activeChallenges}
              valueClass="text-green-400"
            />

            <Card
              title="Passed"
              value={passedChallenges}
              valueClass="text-blue-400"
            />

            <Card
              title="Funded"
              value={fundedChallenges}
              valueClass="text-purple-400"
            />

            <Card
              title="Open Tickets"
              value={openSupportTickets}
              valueClass={
                openSupportTickets > 0
                  ? "text-yellow-400"
                  : "text-white"
              }
            />

            <Card
              title="Revenue"
              value={`$${revenueAmount}`}
              valueClass="text-green-400"
            />
          </div>
        </section>

        {/* ADMIN TOOLS */}
        <section className="mt-9 sm:mt-12">
          <div>
            <h2 className="text-xl font-black sm:text-2xl">
              Admin Tools
            </h2>

            <p className="mt-1 text-xs text-gray-500 sm:text-sm">
              Manage the Mivo Capital platform.
            </p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            <AdminLink
              href="/admin/challenges"
              title="Manage Challenges"
              description="Manage trader accounts, stages and challenge status."
            />

            <AdminLink
              href="/admin/support"
              title="Support Tickets"
              description="View trader support requests, reply and close tickets."
              badge={
                openSupportTickets > 0
                  ? `${openSupportTickets} Open`
                  : undefined
              }
            />

            <AdminLink
              href="/admin/kyc"
              title="KYC Verification"
              description="Review trader identity verification requests."
            />

            <AdminLink
              href="/admin/withdrawals"
              title="Withdrawals"
              description="Review and process trader payout requests."
            />

            <AdminLink
              href="/admin/users"
              title="Users"
              description="View and manage registered Mivo Capital traders."
            />

            <AdminLink
              href="/admin/promos"
              title="Promo Codes"
              description="Create and manage promotional discount codes."
            />
          </div>
        </section>

        {/* MOBILE BOTTOM LINK */}
        <div className="mt-8 border-t border-zinc-900 pb-4 pt-6 sm:hidden">
          <Link
            href="/dashboard"
            className="block w-full rounded-xl border border-zinc-800 px-4 py-3 text-center text-xs font-bold text-gray-400"
          >
            ← Return to Trader Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

function Card({
  title,
  value,
  valueClass = "text-white",
}: {
  title: string;
  value: string | number;
  valueClass?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5">
      <p className="text-[11px] leading-4 text-gray-500 sm:text-sm">
        {title}
      </p>

      <h2
        className={`mt-2 break-words text-xl font-black sm:mt-3 sm:text-3xl ${valueClass}`}
      >
        {value}
      </h2>
    </div>
  );
}

function AdminLink({
  href,
  title,
  description,
  badge,
}: {
  href: string;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-xl border border-zinc-800 bg-zinc-950 p-5 transition active:border-green-500/50 sm:rounded-2xl sm:p-6 sm:hover:border-green-500/50"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-base font-black transition group-hover:text-green-400 sm:text-xl">
          {title}
        </h3>

        {badge && (
          <span className="shrink-0 rounded-full bg-yellow-500/10 px-2.5 py-1 text-[10px] font-bold text-yellow-400 sm:px-3 sm:text-xs">
            {badge}
          </span>
        )}
      </div>

      <p className="mt-2 text-xs leading-5 text-gray-500 sm:mt-3 sm:text-sm sm:leading-6">
        {description}
      </p>

      <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-4">
        <span className="text-xs font-bold text-green-400 sm:text-sm">
          Open
        </span>

        <span className="text-green-400">
          →
        </span>
      </div>
    </Link>
  );
}