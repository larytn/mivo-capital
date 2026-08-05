import { prisma } from "@/lib/prisma";
import Link from "next/link";

const statusColors: Record<string, string> = {
  SUCCESS: "bg-green-500/10 text-green-400",
  COMPLETED: "bg-green-500/10 text-green-400",
  PENDING: "bg-yellow-500/10 text-yellow-400",
  FAILED: "bg-red-500/10 text-red-400",
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
                Payments
              </h1>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                Monitor challenge purchases and payment
                transactions.
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

        {/* STATS */}
        <section className="mt-6 grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
          <StatCard
            title="Total Revenue"
            value={`$${totalRevenue.toLocaleString(
              "en-US",
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            )}`}
            valueClass="text-green-400"
          />

          <StatCard
            title="Successful"
            value={successfulPayments}
            valueClass="text-green-400"
          />

          <StatCard
            title="Pending"
            value={pendingPayments}
            valueClass="text-yellow-400"
          />

          <StatCard
            title="Failed"
            value={failedPayments}
            valueClass="text-red-400"
          />
        </section>

        {/* PAYMENT HISTORY HEADER */}
        <section className="mt-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-black sm:text-2xl">
                Payment History
              </h2>

              <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                {payments.length} payment transactions
              </p>
            </div>
          </div>
        </section>

        {/* EMPTY */}
        {payments.length === 0 ? (
          <section className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-10 text-center">
            <p className="font-bold">
              No Payments Found
            </p>

            <p className="mt-2 text-xs text-gray-500">
              Payment transactions will appear here.
            </p>
          </section>
        ) : (
          <>
            {/* MOBILE PAYMENT CARDS */}
            <section className="mt-5 space-y-3 lg:hidden">
              {payments.map((payment) => (
                <article
                  key={payment.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
                >
                  {/* TOP */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-gray-600">
                        Amount
                      </p>

                      <p className="mt-1 text-xl font-black text-white">
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
                      </p>
                    </div>

                    <PaymentStatus
                      status={payment.status}
                    />
                  </div>

                  {/* TRADER */}
                  <div className="mt-4 rounded-xl bg-black p-4">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-gray-600">
                      Trader
                    </p>

                    <p className="mt-1 break-words text-sm font-black">
                      {payment.user.name}
                    </p>

                    <p className="mt-1 break-all text-[11px] text-gray-500">
                      {payment.user.email}
                    </p>
                  </div>

                  {/* CHALLENGE DETAILS */}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <PaymentInfo
                      label="Account"
                      value={payment.accountSize}
                    />

                    <PaymentInfo
                      label="Program"
                      value={payment.challengeType}
                    />

                    <div className="min-w-0 rounded-xl border border-zinc-800 bg-black p-3">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-gray-600">
                        Method
                      </p>

                      <div className="mt-2">
                        <PaymentMethod
                          method={
                            payment.paymentMethod
                          }
                        />
                      </div>
                    </div>

                    <PaymentInfo
                      label="Date"
                      value={payment.createdAt.toLocaleDateString()}
                    />
                  </div>

                  {/* PROMO */}
                  {payment.promoCode && (
                    <div className="mt-3 rounded-xl border border-purple-500/10 bg-purple-500/[0.05] p-3">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-gray-600">
                        Promo Code
                      </p>

                      <p className="mt-1 text-xs font-black text-purple-400">
                        {payment.promoCode}
                      </p>
                    </div>
                  )}

                  {/* TRANSACTION */}
                  <div className="mt-3 rounded-xl border border-zinc-800 bg-black p-3">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-gray-600">
                      Transaction Reference
                    </p>

                    <p className="mt-1 break-all font-mono text-[10px] leading-5 text-gray-400">
                      {payment.txRef}
                    </p>

                    {payment.flutterwaveTransactionId && (
                      <div className="mt-2 border-t border-zinc-800 pt-2">
                        <p className="break-all text-[10px] text-gray-600">
                          Flutterwave:{" "}
                          {
                            payment.flutterwaveTransactionId
                          }
                        </p>
                      </div>
                    )}

                    {payment.nowPaymentsPaymentId && (
                      <div className="mt-2 border-t border-zinc-800 pt-2">
                        <p className="break-all text-[10px] text-gray-600">
                          Crypto:{" "}
                          {
                            payment.nowPaymentsPaymentId
                          }
                        </p>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </section>

            {/* DESKTOP TABLE */}
            <section className="mt-5 hidden overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 lg:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px]">
                  <thead className="bg-zinc-900">
                    <tr className="text-left text-xs font-bold uppercase text-gray-500">
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
                        className="border-t border-zinc-800 transition hover:bg-zinc-900/60"
                      >
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
                              {
                                payment.nowPaymentsPaymentId
                              }
                            </p>
                          )}
                        </td>

                        <td className="p-4">
                          <p className="font-semibold">
                            {payment.user.name}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {payment.user.email}
                          </p>
                        </td>

                        <td className="p-4">
                          <p className="font-semibold">
                            {payment.accountSize}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {payment.challengeType}
                          </p>
                        </td>

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

                        <td className="p-4">
                          <PaymentMethod
                            method={
                              payment.paymentMethod
                            }
                          />
                        </td>

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

                        <td className="p-4">
                          <PaymentStatus
                            status={
                              payment.status
                            }
                          />
                        </td>

                        <td className="p-4 text-sm text-gray-400">
                          {payment.createdAt.toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function StatCard({
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
      <p className="text-[9px] font-bold uppercase tracking-wide text-gray-600 sm:text-xs">
        {title}
      </p>

      <p
        className={`mt-1 break-words text-lg font-black sm:mt-2 sm:text-2xl ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}

function PaymentInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-zinc-800 bg-black p-3">
      <p className="text-[9px] font-bold uppercase tracking-wide text-gray-600">
        {label}
      </p>

      <p className="mt-1 break-words text-[11px] font-bold text-gray-300">
        {value}
      </p>
    </div>
  );
}

function PaymentStatus({
  status,
}: {
  status: string;
}) {
  const label =
    status === "SUCCESS" ||
    status === "COMPLETED"
      ? "Successful"
      : status === "PENDING"
      ? "Pending"
      : status === "FAILED"
      ? "Failed"
      : status;

  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold sm:px-3 sm:text-xs ${
        statusColors[status] ??
        "bg-zinc-800 text-gray-300"
      }`}
    >
      {label}
    </span>
  );
}

function PaymentMethod({
  method,
}: {
  method: string | null;
}) {
  if (!method) {
    return (
      <span className="text-xs text-gray-600">
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
      <span className="rounded-full bg-orange-500/10 px-2.5 py-1 text-[10px] font-bold text-orange-400 sm:px-3 sm:text-xs">
        Crypto
      </span>
    );
  }

  if (
    normalized.includes("CARD") ||
    normalized.includes("FLUTTERWAVE")
  ) {
    return (
      <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-bold text-blue-400 sm:px-3 sm:text-xs">
        Card
      </span>
    );
  }

  return (
    <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-[10px] font-bold text-gray-300 sm:px-3 sm:text-xs">
      {method}
    </span>
  );
}