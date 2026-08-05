"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";

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
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      {/* HEADER */}
      <section className="border-b border-zinc-900">
        <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-500 sm:text-sm">
                Mivo Capital
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Support Center
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-gray-400 sm:mt-3 sm:text-base">
                Get help with your account, payments and trading
                challenges.
              </p>
            </div>

            <Link
              href="/dashboard"
              className="w-full rounded-xl border border-zinc-700 px-4 py-3 text-center text-sm font-bold transition hover:border-green-500 hover:text-green-400 sm:w-auto sm:px-5"
            >
              ← Dashboard
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        {/* NEW TICKET */}
        <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
          <div className="border-b border-zinc-800 p-4 sm:p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-500">
              Need Help?
            </p>

            <h2 className="mt-1 text-xl font-bold sm:text-2xl">
              Create Support Ticket
            </h2>

            <p className="mt-2 max-w-2xl text-xs leading-5 text-gray-400 sm:text-sm sm:leading-6">
              Tell us what you need help with and our support
              team can respond directly to your ticket.
            </p>
          </div>

          <div className="p-4 sm:p-6">
            <div>
              <label className="mb-2 block text-xs font-medium text-gray-400 sm:text-sm">
                Subject
              </label>

              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What do you need help with?"
                className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3.5 text-sm outline-none transition placeholder:text-gray-600 focus:border-green-500 sm:py-4"
              />
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-medium text-gray-400 sm:text-sm">
                  Message
                </label>

                <span className="text-[10px] text-gray-600">
                  {message.length} characters
                </span>
              </div>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue..."
                rows={5}
                className="w-full resize-none rounded-xl border border-zinc-800 bg-black px-4 py-3.5 text-sm leading-6 outline-none transition placeholder:text-gray-600 focus:border-green-500 sm:p-4"
              />
            </div>

            <button
              type="button"
              onClick={submitTicket}
              disabled={
                loading ||
                !subject.trim() ||
                !message.trim()
              }
              className="mt-4 w-full rounded-xl bg-green-500 px-6 py-3.5 text-sm font-bold text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50 sm:mt-5 sm:w-auto sm:px-7"
            >
              {loading ? "Submitting..." : "Submit Ticket"}
            </button>
          </div>
        </section>

        {/* TICKETS */}
        <section className="mt-8 sm:mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-500">
                Support Activity
              </p>

              <h2 className="mt-1 text-xl font-bold sm:text-2xl">
                My Tickets
              </h2>
            </div>

            {!pageLoading && tickets.length > 0 && (
              <span className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-bold text-gray-400">
                {tickets.length}
              </span>
            )}
          </div>

          {pageLoading ? (
            <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center text-sm text-gray-400 sm:mt-5">
              Loading tickets...
            </div>
          ) : tickets.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950 px-5 py-9 text-center sm:mt-5 sm:p-10">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-green-500/10 text-lg font-black text-green-500">
                ?
              </div>

              <p className="mt-4 font-bold">
                No Support Tickets
              </p>

              <p className="mt-2 text-xs leading-5 text-gray-500 sm:text-sm">
                Your support requests and replies will appear
                here.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3 sm:mt-5 sm:space-y-4">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950"
                >
                  {/* TICKET HEADER */}
                  <div className="p-4 sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="break-words text-base font-bold leading-6 sm:text-lg">
                          {ticket.subject}
                        </h3>

                        <p className="mt-1 text-[10px] text-gray-500 sm:text-xs">
                          {new Date(
                            ticket.createdAt
                          ).toLocaleString()}
                        </p>
                      </div>

                      <TicketStatus status={ticket.status} />
                    </div>

                    <div className="mt-4 rounded-xl border border-zinc-800 bg-black p-3.5 sm:p-4">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-gray-600 sm:text-[10px]">
                        Your Message
                      </p>

                      <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-gray-300 sm:text-sm sm:leading-6">
                        {ticket.message}
                      </p>
                    </div>
                  </div>

                  {/* SUPPORT REPLY */}
                  {ticket.adminReply ? (
                    <div className="border-t border-green-500/20 bg-green-500/[0.06] p-4 sm:p-6">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500 text-[10px] font-black text-black">
                          M
                        </div>

                        <div>
                          <p className="text-xs font-bold text-green-400 sm:text-sm">
                            Mivo Support
                          </p>

                          <p className="text-[9px] text-gray-500 sm:text-[10px]">
                            Official response
                          </p>
                        </div>
                      </div>

                      <p className="mt-3 whitespace-pre-wrap break-words text-xs leading-5 text-gray-300 sm:text-sm sm:leading-6">
                        {ticket.adminReply}
                      </p>
                    </div>
                  ) : (
                    <div className="border-t border-zinc-800 bg-black/40 px-4 py-3 sm:px-6">
                      <p className="text-[10px] text-gray-500 sm:text-xs">
                        Waiting for a response from Mivo Support.
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
      ? "bg-zinc-800 text-gray-400"
      : status === "ANSWERED"
      ? "bg-green-500/10 text-green-400"
      : "bg-yellow-500/10 text-yellow-400";

  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-bold sm:px-3 sm:text-xs ${style}`}
    >
      {status === "ANSWERED"
        ? "Answered"
        : status === "CLOSED"
        ? "Closed"
        : "Open"}
    </span>
  );
}