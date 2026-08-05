import { prisma } from "@/lib/prisma";

const statusColors: Record<string, string> = {
  SUCCESS: "bg-green-500/20 text-green-400",
  COMPLETED: "bg-green-500/20 text-green-400",
  PENDING: "bg-yellow-500/20 text-yellow-400",
  FAILED: "bg-red-500/20 text-red-400",
};

export default async function PaymentsPage() {
  const payments = await prisma.payment.findMany({
    include: {
      user: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const totalRevenue = payments.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );

  return (
    <main className="min-h-screen bg-black p-10 text-white">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-4xl font-bold text-green-500">
          Payments
        </h1>

        <p className="mt-2 text-gray-400">
          All payment transactions
        </p>

        <div className="mt-8 mb-8 rounded-xl bg-zinc-900 p-6">
          <p className="text-gray-400">Total Revenue</p>
          <h2 className="mt-2 text-4xl font-bold">
            ₦{totalRevenue.toLocaleString()}
          </h2>
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full">
            <thead className="bg-zinc-900">
              <tr>
                <th className="p-4 text-left">Transaction</th>
                <th className="p-4 text-left">Trader</th>
                <th className="p-4 text-left">Amount</th>
                <th className="p-4 text-left">Currency</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">Date</th>
              </tr>
            </thead>

            <tbody>
              {payments.map((payment) => (
                <tr
                  key={payment.id}
                  className="border-t border-zinc-800 hover:bg-zinc-900"
                >
                  <td className="p-4 font-mono text-sm">
                    {payment.txRef}
                  </td>

                  <td className="p-4">
                    <div>{payment.user.name}</div>
                    <div className="text-sm text-gray-400">
                      {payment.user.email}
                    </div>
                  </td>

                  <td className="p-4 font-semibold">
                    ₦{payment.amount.toLocaleString()}
                  </td>

                  <td className="p-4">
                    {payment.currency}
                  </td>

                  <td className="p-4">
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-semibold ${
                        statusColors[payment.status] ??
                        "bg-zinc-700 text-white"
                      }`}
                    >
                      {payment.status}
                    </span>
                  </td>

                  <td className="p-4">
                    {payment.createdAt.toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {payments.length === 0 && (
            <div className="p-10 text-center text-gray-400">
              No payments found.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}