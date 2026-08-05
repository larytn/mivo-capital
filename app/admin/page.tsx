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
  ] = await Promise.all([
    prisma.user.count(),
    prisma.challenge.count(),
    prisma.challenge.count({
      where: { status: "PENDING" },
    }),
    prisma.challenge.count({
      where: { status: "ACTIVE" },
    }),
    prisma.challenge.count({
      where: { status: "PASSED" },
    }),
    prisma.challenge.count({
      where: { status: "FUNDED" },
    }),
    prisma.challenge.aggregate({
      _sum: {
        price: true,
      },
    }),
  ]);

  return (
    <main className="min-h-screen bg-black text-white p-10">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-green-500">
          Mivo Capital Admin
        </h1>

        <p className="mt-2 text-gray-400">
          Control Center
        </p>

        <div className="grid gap-6 mt-10 md:grid-cols-3 lg:grid-cols-4">
          <Card title="Total Users" value={totalUsers} />
          <Card title="Challenges" value={totalChallenges} />
          <Card title="Pending" value={pendingChallenges} />
          <Card title="Active" value={activeChallenges} />
          <Card title="Passed" value={passedChallenges} />
          <Card title="Funded" value={fundedChallenges} />
          <Card
            title="Revenue"
            value={`₦${Number(revenue._sum.price ?? 0).toLocaleString()}`}
          />
        </div>

        <div className="mt-10">
          <Link
            href="/admin/challenges"
            className="rounded-xl bg-green-500 px-6 py-3 font-bold text-black"
          >
            Manage Challenges →
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
    <div className="rounded-xl bg-zinc-900 p-6">
      <p className="text-gray-400">{title}</p>
      <h2 className="mt-3 text-3xl font-bold">{value}</h2>
    </div>
  );
}