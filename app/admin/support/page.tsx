"use client";

import { useEffect, useState } from "react";

type Ticket = {
  id: string;
  subject: string;
  message: string;
  status: string;
  adminReply: string | null;
  createdAt: string;

  user: {
    id: string;
    name: string;
    email: string;
  };
};

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(
    null
  );

  const [replies, setReplies] = useState<Record<string, string>>(
    {}
  );

  async function loadTickets() {
    try {
      const response = await fetch("/api/admin/support", {
        cache: "no-store",
      });

      if (response.status === 401) {
        window.location.href = "/admin/login";
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to load tickets.");
        return;
      }

      setTickets(data.tickets || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, []);

  async function updateTicket(
    ticketId: string,
    status: string,
    adminReply?: string
  ) {
    try {
      setProcessingId(ticketId);

      const response = await fetch("/api/admin/support", {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          ticketId,
          status,
          adminReply,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to update ticket.");
        return;
      }

      setReplies((current) => ({
        ...current,
        [ticketId]: "",
      }));

      await loadTickets();
    } catch (error) {
      console.error(error);
      alert("Something went wrong.");
    } finally {
      setProcessingId(null);
    }
  }

  const openTickets = tickets.filter(
    (ticket) => ticket.status === "OPEN"
  ).length;

  const answeredTickets = tickets.filter(
    (ticket) => ticket.status === "ANSWERED"
  ).length;

  const closedTickets = tickets.filter(
    (ticket) => ticket.status === "CLOSED"
  ).length;

  return (
    <div className="mx-auto w-full max-w-6xl">
      {/* HEADER */}

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-green-500 sm:text-sm">
          Mivo Capital Admin
        </p>

        <h1 className="mt-2 text-3xl font-black sm:text-4xl">
          Support Tickets
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400 sm:text-base">
          Review and respond to trader support requests.
        </p>
      </div>

      {/* STATS */}

      <section className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard
          label="Total"
          value={loading ? "..." : tickets.length}
        />

        <StatCard
          label="Open"
          value={loading ? "..." : openTickets}
        />

        <StatCard
          label="Answered"
          value={loading ? "..." : answeredTickets}
        />

        <StatCard
          label="Closed"
          value={loading ? "..." : closedTickets}
        />
      </section>

      {/* TICKETS */}

      <section className="mt-8">
        {loading ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center text-sm text-gray-400">
            Loading support tickets...
          </div>
        ) : tickets.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-10 text-center">
            <h2 className="font-bold">
              No Support Tickets
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Trader support requests will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => {
              const ticketReply = replies[ticket.id] || "";
              const processing = processingId === ticket.id;

              return (
                <article
                  key={ticket.id}
                  className="min-w-0 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900"
                >
                  {/* TICKET HEADER */}

                  <div className="p-4 sm:p-6">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="break-words text-lg font-bold sm:text-xl">
                          {ticket.subject}
                        </h2>

                        <p className="mt-2 break-words text-sm font-semibold text-gray-300">
                          {ticket.user.name}
                        </p>

                        <p className="mt-1 break-all text-xs text-gray-500">
                          {ticket.user.email}
                        </p>

                        <p className="mt-2 text-xs text-gray-600">
                          {new Date(
                            ticket.createdAt
                          ).toLocaleString()}
                        </p>
                      </div>

                      <StatusBadge status={ticket.status} />
                    </div>
                  </div>

                  {/* TRADER MESSAGE */}

                  <div className="border-t border-zinc-800 bg-black/40 p-4 sm:p-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Trader Message
                    </p>

                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-gray-300">
                      {ticket.message}
                    </p>
                  </div>

                  {/* ADMIN REPLY */}

                  {ticket.adminReply && (
                    <div className="border-t border-green-500/20 bg-green-500/5 p-4 sm:p-6">
                      <p className="text-xs font-bold uppercase tracking-wider text-green-400">
                        Mivo Support Reply
                      </p>

                      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-gray-300">
                        {ticket.adminReply}
                      </p>
                    </div>
                  )}

                  {/* ACTIONS */}

                  {ticket.status !== "CLOSED" && (
                    <div className="border-t border-zinc-800 p-4 sm:p-6">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                        Reply
                      </label>

                      <textarea
                        value={ticketReply}
                        onChange={(e) =>
                          setReplies((current) => ({
                            ...current,
                            [ticket.id]: e.target.value,
                          }))
                        }
                        placeholder="Write your reply to this trader..."
                        rows={4}
                        className="mt-3 w-full resize-none rounded-xl border border-zinc-700 bg-black px-4 py-3 text-base text-white outline-none transition placeholder:text-gray-600 focus:border-green-500"
                      />

                      <div className="mt-4 grid gap-3 sm:flex sm:flex-wrap">
                        <button
                          type="button"
                          disabled={processing}
                          onClick={() => {
                            if (!ticketReply.trim()) {
                              alert("Enter a reply first.");
                              return;
                            }

                            updateTicket(
                              ticket.id,
                              "ANSWERED",
                              ticketReply.trim()
                            );
                          }}
                          className="w-full rounded-xl bg-green-500 px-5 py-3 font-bold text-black transition hover:bg-green-400 disabled:opacity-50 sm:w-auto"
                        >
                          {processing
                            ? "Processing..."
                            : "Send Reply"}
                        </button>

                        <button
                          type="button"
                          disabled={processing}
                          onClick={() => {
                            const confirmed = window.confirm(
                              "Close this support ticket?"
                            );

                            if (!confirmed) return;

                            updateTicket(
                              ticket.id,
                              "CLOSED",
                              ticket.adminReply || undefined
                            );
                          }}
                          className="w-full rounded-xl border border-zinc-700 px-5 py-3 font-bold text-gray-300 transition hover:border-red-500 hover:text-red-400 disabled:opacity-50 sm:w-auto"
                        >
                          Close Ticket
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
      <p className="text-xs text-gray-500 sm:text-sm">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black sm:text-3xl">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const style =
    status === "CLOSED"
      ? "bg-zinc-700 text-gray-300"
      : status === "ANSWERED"
      ? "bg-green-500/10 text-green-400"
      : "bg-yellow-500/10 text-yellow-400";

  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold sm:px-3 sm:text-xs ${style}`}
    >
      {status === "ANSWERED"
        ? "ANSWERED"
        : status === "CLOSED"
        ? "CLOSED"
        : "OPEN"}
    </span>
  );
}