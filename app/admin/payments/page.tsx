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
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });

  // ONLY SUCCESSFUL PAYMENTS COUNT AS REVENUE
  const totalRevenue = payments
    .filter(
      (payment) =>
        payment.status === "SUCCESS" ||
        payment.status === "COMPLETED"
    )
    .reduce(
      (sum, payment) => sum + payment.amount,
      0
    );

  const successfulPayments = payments.filter(
    (payment) =>
      payment.status === "SUCCESS" ||
      payment.status === "COMPLETED"
  ).length;

  const pendingPayments = payments.filter(
    (payment) => payment.status === "PENDING"
  ).length;

  const failedPayments = payments.filter(
    (payment) => payment.status === "FAILED"
  ).length;

  return (
    <div className="mx-auto max-w-7xl">
      {/* HEADER */}

      <div>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-500">
          Mivo Capital Admin
        </p>

        <h1 className="mt-2 text-4xl font-black">
          Payments
        </h1>

        <p className="mt-2 text-gray-400">
          Monitor challenge purchases and payment transactions.
        </p>
      </div>

      {/* STATS */}

      <section className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={`$${totalRevenue.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
        />

        <StatCard
          title="Successful"
          value={successfulPayments}
        />

        <StatCard
          title="Pending"
          value={pendingPayments}
        />

        <StatCard
          title="Failed"
          value={failedPayments}
        />
      </section>

      {/* PAYMENTS TABLE */}

      <section className="mt-8 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
        <div className="border-b border-zinc-800 p-6">
          <h2 className="text-xl font-bold">
            Payment History
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            {payments.length} payment transactions
          </p>
        </div>

        {payments.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            No payments found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1200px] w-full">
              <thead className="bg-zinc-950">
                <tr className="text-left text-xs uppercase text-gray-500">
                  <th className="p-4">
                    Transaction
                  </th>

                  <th className="p-4">
                    Trader
                  </th>

                  <th className="p-4">
                    Challenge
                  </th>

                  <th className="p-4">
                    Amount
                  </th>

                  <th className="p-4">
                    Method
                  </th>

                  <th className="p-4">
                    Promo
                  </th>

                  <th className="p-4">
                    Status
                  </th>

                  <th className="p-4">
                    Date
                  </th>
                </tr>
              </thead>

              <tbody>
                {payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-t border-zinc-800 transition hover:bg-zinc-800/50"
                  >
                    {/* TRANSACTION */}

                    <td className="p-4">
                      <p className="max-w-[180px] truncate font-mono text-xs text-gray-300">
                        {payment.txRef}
                      </p>

                      {payment.flutterwaveTransactionId && (
                        <p className="mt-1 text-xs text-gray-600">
                          FW:{" "}
                          {
                            payment.flutterwaveTransactionId
                          }
                        </p>
                      )}

                      {payment.nowPaymentsPaymentId && (
                        <p className="mt-1 text-xs text-gray-600">
                          Crypto:{" "}
                          {payment.nowPaymentsPaymentId}
                        </p>
                      )}
                    </td>

                    {/* TRADER */}

                    <td className="p-4">
                      <p className="font-semibold">
                        {payment.user.name}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {payment.user.email}
                      </p>
                    </td>

                    {/* CHALLENGE */}

                    <td className="p-4">
                      <p className="font-semibold">
                        {payment.accountSize}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {payment.challengeType}
                      </p>
                    </td>

                    {/* AMOUNT */}

                    <td className="p-4 font-bold">
                      {payment.currency === "USD"
                        ? "$"
                        : `${payment.currency} `}
                      {payment.amount.toLocaleString(
                        "en-US",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}
                    </td>

                    {/* METHOD */}

                    <td className="p-4">
                      <PaymentMethod
                        method={payment.paymentMethod}
                      />
                    </td>

                    {/* PROMO */}

                    <td className="p-4">
                      {payment.promoCode ? (
                        <span className="rounded-lg bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-400">
                          {payment.promoCode}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-600">
                          —
                        </span>
                      )}
                    </td>

                    {/* STATUS */}

                    <td className="p-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          statusColors[
                            payment.status
                          ] ??
                          "bg-zinc-700 text-white"
                        }`}
                      >
                        {payment.status}
                      </span>
                    </td>

                    {/* DATE */}

                    <td className="p-4 text-sm text-gray-400">
                      {payment.createdAt.toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <p className="text-sm text-gray-500">
        {title}
      </p>

      <p className="mt-2 text-3xl font-black">
        {value}
      </p>
    </div>
  );
}

function PaymentMethod({
  method,
}: {
  method: string | null;
}) {
  if (!method) {
    return (
      <span className="text-sm text-gray-600">
        —
      </span>
    );
  }

  const normalized = method.toUpperCase();

  if (
    normalized.includes("CRYPTO") ||
    normalized.includes("NOWPAYMENTS")
  ) {
    return (
      <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-400">
        Crypto
      </span>
    );
  }

  if (
    normalized.includes("CARD") ||
    normalized.includes("FLUTTERWAVE")
  ) {
    return (
      <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-400">
        Card
      </span>
    );
  }

  return (
    <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-bold text-gray-300">
      {method}
    </span>
  );
}