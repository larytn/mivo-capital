import { prisma } from "@/lib/prisma";

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    include: {
      challenges: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main className="min-h-screen bg-black text-white p-10">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-green-500">
          User Management
        </h1>

        <p className="mt-2 text-gray-400">
          All registered traders
        </p>

        <div className="mt-8 overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full">
            <thead className="bg-zinc-900">
              <tr>
                <th className="p-4 text-left">Name</th>
                <th className="p-4 text-left">Email</th>
                <th className="p-4 text-left">Role</th>
                <th className="p-4 text-left">Challenges</th>
                <th className="p-4 text-left">Joined</th>
              </tr>
            </thead>

            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-t border-zinc-800 hover:bg-zinc-900"
                >
                  <td className="p-4 font-medium">
                    {user.name}
                  </td>

                  <td className="p-4">
                    {user.email}
                  </td>

                  <td className="p-4">
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-semibold ${
                        user.role === "ADMIN"
                          ? "bg-purple-500/20 text-purple-400"
                          : "bg-green-500/20 text-green-400"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>

                  <td className="p-4">
                    {user.challenges.length}
                  </td>

                  <td className="p-4">
                    {user.createdAt.toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <div className="p-10 text-center text-gray-400">
              No users found.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}