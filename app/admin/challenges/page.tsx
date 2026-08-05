import { prisma } from "@/lib/prisma";
import Link from "next/link";

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-500/20 text-yellow-400",
  ACTIVE: "bg-green-500/20 text-green-400",
  PASSED: "bg-blue-500/20 text-blue-400",
  FUNDED: "bg-purple-500/20 text-purple-400",
  INACTIVE: "bg-red-500/20 text-red-400",
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
    <main className="min-h-screen bg-black text-white p-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-green-500">
              Challenge Management
            </h1>

            <p className="text-gray-400 mt-2">
              Manage trader accounts
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full">
            <thead className="bg-zinc-900">
              <tr>
                <th className="p-4 text-left">Trader</th>
                <th className="p-4 text-left">Email</th>
                <th className="p-4 text-left">Account</th>
                <th className="p-4 text-left">Type</th>
                <th className="p-4 text-left">Price</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">Purchased</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>

            <tbody>
              {challenges.map((challenge) => (
                <tr
                  key={challenge.id}
                  className="border-t border-zinc-800 hover:bg-zinc-900"
                >
                  <td className="p-4">{challenge.user.name}</td>

                  <td className="p-4">{challenge.user.email}</td>

                  <td className="p-4">{challenge.account}</td>

                  <td className="p-4">{challenge.type}</td>

                  <td className="p-4">
                    ₦{challenge.price.toLocaleString()}
                  </td>

                  <td className="p-4">
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-semibold ${
                        statusColors[challenge.status]
                      }`}
                    >
                      {challenge.status}
                    </span>
                  </td>

                  <td className="p-4">
                    {challenge.createdAt.toLocaleDateString()}
                  </td>

                  <td className="p-4 text-center">
                    <Link
                      href={`/admin/challenges/${challenge.id}`}
                      className="rounded-lg bg-green-500 px-4 py-2 font-semibold text-black hover:bg-green-400"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {challenges.length === 0 && (
            <div className="p-10 text-center text-gray-400">
              No challenges found.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}