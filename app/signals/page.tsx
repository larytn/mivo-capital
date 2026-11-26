"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MivoProModal } from "@/app/components/mivo-pro-modal";

type VipSignal = {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  timeframe: string;
  entryLow: number;
  entryHigh: number;
  stopLoss: number;
  takeProfits: number[];
  thesis: string;
  status: "ACTIVE" | "CLOSED" | "CANCELLED";
  outcomeNote: string | null;
  publishedAt: string;
  closedAt: string | null;
  createdBy: { name: string };
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(value);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

export default function VipSignalsPage() {
  const [signals, setSignals] = useState<VipSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [vipRequired, setVipRequired] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"ACTIVE" | "ALL">("ACTIVE");
  const [mivoProOpen, setMivoProOpen] = useState(false);
  const [membershipNotice, setMembershipNotice] = useState<"active" | "failed" | null>(null);
  const closeMivoPro = useCallback(() => setMivoProOpen(false), []);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/vip-signals", { cache: "no-store" });
      const data = await response.json() as { signals?: VipSignal[]; error?: string; code?: string };
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (response.status === 403 && data.code === "VIP_REQUIRED") {
        setVipRequired(true);
        setMivoProOpen(true);
        setError("");
        return;
      }
      if (!response.ok) throw new Error(data.error || "Unable to load VIP Signals.");
      setSignals(Array.isArray(data.signals) ? data.signals : []);
      setVipRequired(false);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load VIP Signals.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("membership");
    if (result === "active" || result === "failed") setMembershipNotice(result);
  }, []);

  const visible = filter === "ACTIVE" ? signals.filter((signal) => signal.status === "ACTIVE") : signals;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-accent">Community · Members area</p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">VIP Signals</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Trade ideas published by Mivo. Review the entry area, invalidation level and targets before making your own decision.</p>
        </div>
        {!vipRequired && <div className="flex flex-wrap items-center gap-2">
          <Link href="/automation" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent transition hover:bg-accent/15">Connect MT5 for journaling</Link>
          <div className="flex gap-2 rounded-xl border border-border bg-surface p-1" aria-label="Signal history filter">
            {(["ACTIVE", "ALL"] as const).map((value) => <button key={value} type="button" onClick={() => setFilter(value)} aria-pressed={filter === value} className={`rounded-lg px-3 py-2 text-xs font-semibold ${filter === value ? "bg-foreground text-background" : "text-muted hover:text-foreground"}`}>{value === "ACTIVE" ? "Active" : "All history"}</button>)}
          </div>
        </div>}
      </div>

      <div className="mt-5 rounded-xl border border-amber-300/25 bg-amber-300/5 p-4 text-xs leading-5 text-amber-100/90">Signals are educational market commentary, not individualized financial advice or a guarantee of results. This area publishes ideas only; it does not place or copy trades.</div>
      {membershipNotice && <p role="status" className={`mt-4 rounded-xl border p-4 text-sm ${membershipNotice === "active" ? "border-emerald-400/30 bg-emerald-400/5 text-emerald-200" : "border-amber-300/30 bg-amber-300/5 text-amber-100"}`}>{membershipNotice === "active" ? "Mivo Pro is active. Your included features are loading." : "Checkout was not completed, so Mivo Pro access was not changed."}</p>}
      {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-400/5 p-4 text-sm text-red-200">{error}</p>}
      {vipRequired ? <section className="mt-6 rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-accent">Included with Mivo Pro</p>
        <h2 className="mt-2 text-xl font-semibold">VIP Signals are part of Mivo Pro</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Mivo Pro includes VIP Signals, MT5 automated journaling, advanced Academy access, daily live streams and mentorship. Choose monthly or yearly billing in one place.</p>
        <button type="button" onClick={() => setMivoProOpen(true)} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-5 py-3 text-sm font-extrabold text-accent-foreground transition hover:brightness-110">View Mivo Pro</button>
      </section> : loading ? <p className="mt-8 text-sm text-muted">Loading VIP Signals…</p> : visible.length === 0 ? <section className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center">
        <h2 className="font-semibold">No {filter === "ACTIVE" ? "active " : ""}signals yet</h2>
        <p className="mt-2 text-sm text-muted">New Mivo signal updates will appear here when published.</p>
      </section> : <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {visible.map((signal) => <article key={signal.id} className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-lg font-bold">{signal.symbol} <span className={`ml-1 rounded-md px-2 py-1 text-xs ${signal.side === "BUY" ? "bg-emerald-400/10 text-emerald-300" : "bg-rose-400/10 text-rose-300"}`}>{signal.side}</span></p><p className="mt-1 text-xs text-muted">{signal.timeframe} · {formatDate(signal.publishedAt)}</p></div>
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${signal.status === "ACTIVE" ? "border-emerald-300/25 text-emerald-300" : "border-border text-muted"}`}>{signal.status === "ACTIVE" ? "Active" : signal.status === "CLOSED" ? "Closed" : "Cancelled"}</span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div><p className="text-xs text-muted">Entry area</p><p className="mt-1 font-semibold tabular-nums">{formatPrice(signal.entryLow)}–{formatPrice(signal.entryHigh)}</p></div>
            <div><p className="text-xs text-muted">Stop loss</p><p className="mt-1 font-semibold tabular-nums">{formatPrice(signal.stopLoss)}</p></div>
            <div className="col-span-2"><p className="text-xs text-muted">Targets</p><p className="mt-1 font-semibold tabular-nums">{signal.takeProfits.map(formatPrice).join(" · ")}</p></div>
          </div>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-foreground/90">{signal.thesis}</p>
          {signal.outcomeNote && <p className="mt-4 rounded-lg border border-border bg-background p-3 text-sm"><span className="font-semibold">Update:</span> {signal.outcomeNote}</p>}
          <p className="mt-4 border-t border-border pt-3 text-xs text-muted">Published by {signal.createdBy.name}</p>
        </article>)}
      </div>}
      <MivoProModal open={mivoProOpen} onClose={closeMivoPro} />
    </main>
  );
}
