import { prisma } from "@/lib/prisma";
import Link from "next/link";

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-500/15 text-yellow-400",
  ACTIVE: "bg-green-500/15 text-green-400",
  PASSED: "bg-blue-500/15 text-blue-400",
  FUNDED: "bg-purple-500/15 text-purple-400",
  FAILED: "bg-red-500/15 text-red-400",
  INACTIVE: "bg-red-500/15 text-red-400",
};

export default async function ChallengesPage() {
  const challenges = await prisma.challenge.findMany({
    include: {
      user: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6 sm:py-8 lg:px-10">
      <div className="mx-auto w-full max-w-7xl">
        {/* HEADER */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-green-500 sm:text-xs">
                Mivo Capital Admin
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Challenge Management
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                Manage trader accounts and challenges.
              </p>
            </div>

            <Link
              href="/admin"
              className="w-full rounded-xl border border-zinc-700 px-4 py-3 text-center text-xs font-bold text-gray-300 transition hover:border-green-500 hover:text-green-400 sm:w-auto sm:text-sm"
            >
              ← Admin Dashboard
            </Link>
          </div>
        </section>

        {/* COUNT */}
        <section className="mt-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 sm:inline-block sm:min-w-[180px] sm:p-5">
            <p className="text-xs text-gray-500">
              Total Challenges
            </p>

            <p className="mt-1 text-2xl font-black">
              {challenges.length}
            </p>
          </div>
        </section>

        {/* MOBILE CARDS */}
        <section className="mt-6 space-y-3 lg:hidden">
          {challenges.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-8 text-center text-sm text-gray-500">
              No challenges found.
            </div>
          ) : (
            challenges.map((challenge) => (
              <div
                key={challenge.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-base font-black">
                      {challenge.user.name}
                    </p>

                    <p className="mt-1 break-all text-xs text-gray-500">
                      {challenge.user.email}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      statusColors[challenge.status] ??
                      "bg-zinc-800 text-gray-300"
                    }`}
                  >
                    {challenge.status}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <MobileStat
                    label="Account"
                    value={challenge.account}
                  />

                  <MobileStat
                    label="Type"
                    value={challenge.type}
                  />

                  <MobileStat
                    label="Price"
                    value={`₦${challenge.price.toLocaleString()}`}
                  />

                  <MobileStat
                    label="Purchased"
                    value={challenge.createdAt.toLocaleDateString()}
                  />
                </div>

                <Link
                  href={`/admin/challenges/${challenge.id}`}
                  className="mt-5 block w-full rounded-xl bg-green-500 px-4 py-3 text-center text-sm font-black text-black transition hover:bg-green-400"
                >
                  Manage Challenge
                </Link>
              </div>
            ))
          )}
        </section>

        {/* DESKTOP TABLE */}
        <section className="mt-6 hidden overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 lg:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px]">
              <thead className="bg-zinc-900">
                <tr className="text-xs uppercase tracking-wide text-gray-500">
                  <th className="p-4 text-left">
                    Trader
                  </th>

                  <th className="p-4 text-left">
                    Email
                  </th>

                  <th className="p-4 text-left">
                    Account
                  </th>

                  <th className="p-4 text-left">
                    Type
                  </th>

                  <th className="p-4 text-left">
                    Price
                  </th>

                  <th className="p-4 text-left">
                    Status
                  </th>

                  <th className="p-4 text-left">
                    Purchased
                  </th>

                  <th className="p-4 text-center">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {challenges.map((challenge) => (
                  <tr
                    key={challenge.id}
                    className="border-t border-zinc-800 transition hover:bg-zinc-900/70"
                  >
                    <td className="p-4 font-semibold">
                      {challenge.user.name}
                    </td>

                    <td className="p-4 text-sm text-gray-400">
                      {challenge.user.email}
                    </td>

                    <td className="p-4">
                      {challenge.account}
                    </td>

                    <td className="p-4 text-sm text-gray-300">
                      {challenge.type}
                    </td>

                    <td className="p-4 font-bold">
                      ₦
                      {challenge.price.toLocaleString()}
                    </td>

                    <td className="p-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          statusColors[
                            challenge.status
                          ] ??
                          "bg-zinc-800 text-gray-300"
                        }`}
                      >
                        {challenge.status}
                      </span>
                    </td>

                    <td className="p-4 text-sm text-gray-400">
                      {challenge.createdAt.toLocaleDateString()}
                    </td>

                    <td className="p-4 text-center">
                      <Link
                        href={`/admin/challenges/${challenge.id}`}
                        className="inline-block rounded-lg bg-green-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-green-400"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {challenges.length === 0 && (
            <div className="p-10 text-center text-gray-500">
              No challenges found.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function MobileStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-black p-3">
      <p className="text-[10px] uppercase tracking-wide text-gray-600">
        {label}
      </p>

      <p className="mt-1 break-words text-xs font-bold text-gray-200">
        {value}
      </p>
    </div>
  );
}