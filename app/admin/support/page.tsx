"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
  const [replyingId, setReplyingId] = useState<string | null>(
    null
  );
  const [reply, setReply] = useState("");

  async function loadTickets() {
    try {
      const response = await fetch("/api/admin/support", {
        cache: "no-store",
      });

      if (response.status === 401) {
        window.location.href = "/login";
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
      setReplyingId(ticketId);

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

      setReply("");
      await loadTickets();
    } catch (error) {
      console.error(error);
      alert("Something went wrong.");
    } finally {
      setReplyingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-black px-5 py-10 text-white md:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-500">
              Mivo Capital Admin
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Support Tickets
            </h1>

            <p className="mt-2 text-gray-400">
              Review and respond to trader support requests.
            </p>
          </div>

          <Link
            href="/admin"
            className="rounded-lg border border-zinc-700 px-5 py-3 font-bold hover:border-green-500 hover:text-green-400"
          >
            ← Admin Dashboard
          </Link>
        </div>

        <section className="mt-10">
          {loading ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-10 text-center text-gray-400">
              Loading support tickets...
            </div>
          ) : tickets.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-10 text-center">
              <h2 className="text-xl font-bold">
                No Support Tickets
              </h2>

              <p className="mt-2 text-gray-500">
                Trader support requests will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold">
                        {ticket.subject}
                      </h2>

                      <p className="mt-2 text-sm text-gray-400">
                        {ticket.user.name} • {ticket.user.email}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {new Date(
                          ticket.createdAt
                        ).toLocaleString()}
                      </p>
                    </div>

                    <StatusBadge status={ticket.status} />
                  </div>

                  <div className="mt-5 rounded-xl bg-black p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Trader Message
                    </p>

                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-300">
                      {ticket.message}
                    </p>
                  </div>

                  {ticket.adminReply && (
                    <div className="mt-4 rounded-xl border border-green-500/20 bg-green-500/10 p-5">
                      <p className="text-xs font-bold uppercase tracking-wider text-green-400">
                        Admin Reply
                      </p>

                      <p className="mt-3 whitespace-pre-wrap text-sm text-gray-300">
                        {ticket.adminReply}
                      </p>
                    </div>
                  )}

                  {ticket.status !== "CLOSED" && (
                    <>
                      <textarea
                        value={
                          replyingId === ticket.id
                            ? reply
                            : ""
                        }
                        onChange={(e) => {
                          setReplyingId(ticket.id);
                          setReply(e.target.value);
                        }}
                        placeholder="Write your reply..."
                        rows={4}
                        className="mt-5 w-full resize-none rounded-xl border border-zinc-700 bg-black p-4 outline-none focus:border-green-500"
                      />

                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          onClick={() => {
                            if (!reply.trim()) {
                              alert("Enter a reply first.");
                              return;
                            }

                            updateTicket(
                              ticket.id,
                              "ANSWERED",
                              reply.trim()
                            );
                          }}
                          className="rounded-lg bg-green-500 px-5 py-3 font-bold text-black hover:bg-green-400"
                        >
                          Send Reply
                        </button>

                        <button
                          onClick={() =>
                            updateTicket(
                              ticket.id,
                              "CLOSED",
                              ticket.adminReply || undefined
                            )
                          }
                          className="rounded-lg border border-zinc-700 px-5 py-3 font-bold hover:border-red-500 hover:text-red-400"
                        >
                          Close Ticket
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
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
      className={`rounded-full px-3 py-1 text-xs font-bold ${style}`}
    >
      {status}
    </span>
  );
}