"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Ticket = {
  id: string;
  subject: string;
  message: string;
  status: string;
  adminReply: string | null;
  createdAt: string;
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  async function loadTickets() {
    try {
      const response = await fetch("/api/support", {
        cache: "no-store",
      });

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      const data = await response.json();

      if (response.ok) {
        setTickets(data.tickets || []);
      }
    } catch (error) {
      console.error("Support error:", error);
    } finally {
      setPageLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, []);

  async function submitTicket() {
    if (!subject.trim() || !message.trim()) {
      alert("Please enter a subject and message.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject,
          message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to submit ticket.");
        return;
      }

      alert("Support ticket submitted.");

      setSubject("");
      setMessage("");

      await loadTickets();
    } catch (error) {
      console.error(error);
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-5 py-10 text-white md:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-500">
              Mivo Capital
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Support Center
            </h1>

            <p className="mt-3 text-gray-400">
              Get help with your account, payments and trading
              challenges.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-lg border border-zinc-700 px-5 py-3 text-sm font-bold hover:border-green-500 hover:text-green-400"
          >
            ← Dashboard
          </Link>
        </div>

        {/* NEW TICKET */}

        <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900 p-6 md:p-8">
          <h2 className="text-2xl font-bold">
            Create Support Ticket
          </h2>

          <p className="mt-2 text-sm text-gray-400">
            Describe the issue you're experiencing and our
            support team can respond to your ticket.
          </p>

          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="mt-6 w-full rounded-xl border border-zinc-700 bg-black p-4 outline-none focus:border-green-500"
          />

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your issue..."
            rows={6}
            className="mt-4 w-full resize-none rounded-xl border border-zinc-700 bg-black p-4 outline-none focus:border-green-500"
          />

          <button
            onClick={submitTicket}
            disabled={loading}
            className="mt-5 rounded-xl bg-green-500 px-7 py-3 font-bold text-black transition hover:bg-green-400 disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit Ticket"}
          </button>
        </section>

        {/* TICKETS */}

        <section className="mt-10">
          <h2 className="text-2xl font-bold">
            My Tickets
          </h2>

          {pageLoading ? (
            <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-gray-400">
              Loading tickets...
            </div>
          ) : tickets.length === 0 ? (
            <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
              <p className="font-bold">
                No Support Tickets
              </p>

              <p className="mt-2 text-sm text-gray-500">
                Your support requests will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold">
                        {ticket.subject}
                      </h3>

                      <p className="mt-1 text-xs text-gray-500">
                        {new Date(
                          ticket.createdAt
                        ).toLocaleString()}
                      </p>
                    </div>

                    <TicketStatus status={ticket.status} />
                  </div>

                  <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-gray-300">
                    {ticket.message}
                  </p>

                  {ticket.adminReply && (
                    <div className="mt-5 rounded-xl border border-green-500/20 bg-green-500/10 p-4">
                      <p className="text-xs font-bold uppercase text-green-400">
                        Mivo Support
                      </p>

                      <p className="mt-2 whitespace-pre-wrap text-sm text-gray-300">
                        {ticket.adminReply}
                      </p>
                    </div>
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

function TicketStatus({
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
      {status === "ANSWERED"
        ? "Answered"
        : status === "CLOSED"
        ? "Closed"
        : "Open"}
    </span>
  );
}