import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-black text-white">
      <aside className="flex w-72 flex-col border-r border-zinc-800 bg-zinc-950">
        <div className="border-b border-zinc-800 p-6">
          <h1 className="text-3xl font-bold text-green-500">
            Mivo Admin
          </h1>

          <p className="mt-2 text-sm text-gray-400">
            Control Center
          </p>
        </div>

        <nav className="flex-1 space-y-2 p-6">
          <Link
            href="/admin"
            className="block rounded-lg px-4 py-3 hover:bg-zinc-800"
          >
            📊 Dashboard
          </Link>

          <Link
            href="/admin/challenges"
            className="block rounded-lg px-4 py-3 hover:bg-zinc-800"
          >
            📈 Challenges
          </Link>

          <Link
            href="/admin/users"
            className="block rounded-lg px-4 py-3 hover:bg-zinc-800"
          >
            👥 Users
          </Link>

          <Link
            href="/admin/payments"
            className="block rounded-lg px-4 py-3 hover:bg-zinc-800"
          >
            💳 Payments
          </Link>

          <Link
            href="/admin/withdrawals"
            className="block rounded-lg px-4 py-3 hover:bg-zinc-800"
          >
            💰 Withdrawals
          </Link>
        </nav>

        <div className="border-t border-zinc-800 p-6">
          <Link
            href="/dashboard"
            className="block rounded-lg bg-green-500 px-4 py-3 text-center font-bold text-black hover:bg-green-400"
          >
            Trader Dashboard
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}