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

  return (
    <main className="min-h-screen bg-black p-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-500">
            Mivo Capital
          </p>

          <h1 className="mt-2 text-4xl font-black">
            Admin Dashboard
          </h1>

          <p className="mt-2 text-gray-400">
            Mivo Capital Control Center
          </p>
        </div>

        {/* STATS */}

        <div className="mt-10 grid gap-6 md:grid-cols-3 lg:grid-cols-4">
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
          />

          <Card
            title="Active"
            value={activeChallenges}
          />

          <Card
            title="Passed"
            value={passedChallenges}
          />

          <Card
            title="Funded"
            value={fundedChallenges}
          />

          <Card
            title="Open Support Tickets"
            value={openSupportTickets}
          />

          <Card
            title="Revenue"
            value={`$${Number(
              revenue._sum.price ?? 0
            ).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
          />
        </div>

        {/* ADMIN TOOLS */}

        <section className="mt-12">
          <h2 className="text-2xl font-bold">
            Admin Tools
          </h2>

          <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
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

        <div className="mt-10">
          <Link
            href="/dashboard"
            className="text-sm font-semibold text-gray-500 transition hover:text-green-400"
          >
            ← Trader Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

function Card({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <p className="text-sm text-gray-400">
        {title}
      </p>

      <h2 className="mt-3 text-3xl font-bold">
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
      className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-6 transition hover:border-green-500/50"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xl font-bold transition group-hover:text-green-400">
          {title}
        </h3>

        {badge && (
          <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-bold text-green-400">
            {badge}
          </span>
        )}
      </div>

      <p className="mt-3 text-sm leading-6 text-gray-400">
        {description}
      </p>

      <p className="mt-5 text-sm font-bold text-green-400">
        Open →
      </p>
    </Link>
  );
}