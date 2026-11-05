"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type Signal = {
  id: string; symbol: string; side: "BUY" | "SELL"; timeframe: string; entryLow: number; entryHigh: number;
  stopLoss: number; takeProfits: number[]; thesis: string; status: string; outcomeNote: string | null;
  publishedAt: string; createdBy: { name: string };
};
const initialForm = { symbol: "", side: "BUY", timeframe: "H1", entryLow: "", entryHigh: "", stopLoss: "", takeProfits: "", thesis: "" };

export default function AdminVipSignalsPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/vip-signals", { cache: "no-store" });
      const data = await response.json() as { signals?: Signal[]; error?: string };
      if (response.status === 401 || response.status === 403) { window.location.assign("/admin/login"); return; }
      if (!response.ok) throw new Error(data.error || "Unable to load signals.");
      setSignals(Array.isArray(data.signals) ? data.signals : []);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load signals."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/vip-signals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, takeProfits: form.takeProfits.split(",").map((item) => Number(item.trim())) }) });
      const data = await response.json() as { signal?: Signal; error?: string };
      if (response.status === 401 || response.status === 403) { window.location.assign("/admin/login"); return; }
      if (!response.ok) throw new Error(data.error || "Unable to publish the signal.");
      setForm(initialForm); setMessage("VIP Signal published for VIP members."); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to publish the signal."); }
    finally { setBusy(false); }
  }

  async function closeSignal(signal: Signal, status: "CLOSED" | "CANCELLED") {
    const outcomeNote = window.prompt(status === "CLOSED" ? "Add a brief outcome/update for members:" : "Why was this signal cancelled?");
    if (outcomeNote === null) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/vip-signals", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ signalId: signal.id, status, outcomeNote }) });
      const data = await response.json() as { error?: string };
      if (response.status === 401 || response.status === 403) { window.location.assign("/admin/login"); return; }
      if (!response.ok) throw new Error(data.error || "Unable to update the signal.");
      setMessage("Signal status updated."); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to update the signal."); }
    finally { setBusy(false); }
  }

  const field = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent";
  return <section className="max-w-5xl">
    <p className="text-xs font-bold uppercase tracking-[.16em] text-accent">Community publishing</p>
    <h1 className="mt-2 text-2xl font-bold">VIP Signals</h1>
    <p className="mt-2 text-sm leading-6 text-muted">Publish specific trade ideas for accounts marked VIP. Signal posts are separate from copy-trading relationships and never place orders.</p>
    <form onSubmit={publish} className="mt-5 grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-2 sm:p-5">
      <label className="text-xs font-semibold text-muted">Market<input required maxLength={24} className={`${field} mt-1.5`} value={form.symbol} onChange={(event) => setForm({ ...form, symbol: event.target.value })} placeholder="EURUSD" /></label>
      <label className="text-xs font-semibold text-muted">Direction<select className={`${field} mt-1.5`} value={form.side} onChange={(event) => setForm({ ...form, side: event.target.value })}><option value="BUY">Buy</option><option value="SELL">Sell</option></select></label>
      <label className="text-xs font-semibold text-muted">Timeframe<select className={`${field} mt-1.5`} value={form.timeframe} onChange={(event) => setForm({ ...form, timeframe: event.target.value })}>{["M5", "M15", "M30", "H1", "H4", "D1", "W1"].map((value) => <option key={value}>{value}</option>)}</select></label>
      <div className="grid grid-cols-2 gap-3"><label className="text-xs font-semibold text-muted">Entry low<input required type="number" min="0" step="any" className={`${field} mt-1.5`} value={form.entryLow} onChange={(event) => setForm({ ...form, entryLow: event.target.value })} /></label><label className="text-xs font-semibold text-muted">Entry high<input required type="number" min="0" step="any" className={`${field} mt-1.5`} value={form.entryHigh} onChange={(event) => setForm({ ...form, entryHigh: event.target.value })} /></label></div>
      <label className="text-xs font-semibold text-muted">Stop loss<input required type="number" min="0" step="any" className={`${field} mt-1.5`} value={form.stopLoss} onChange={(event) => setForm({ ...form, stopLoss: event.target.value })} /></label>
      <label className="text-xs font-semibold text-muted">Take-profit levels<input required className={`${field} mt-1.5`} value={form.takeProfits} onChange={(event) => setForm({ ...form, takeProfits: event.target.value })} placeholder="1.0850, 1.0900" /><span className="mt-1 block text-[11px] font-normal">Enter 1–3 prices separated by commas.</span></label>
      <label className="text-xs font-semibold text-muted sm:col-span-2">Analysis and invalidation<textarea required minLength={20} maxLength={1600} className={`${field} mt-1.5 min-h-24`} value={form.thesis} onChange={(event) => setForm({ ...form, thesis: event.target.value })} /></label>
      <button type="submit" disabled={busy} className="w-fit rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-50">{busy ? "Publishing…" : "Publish VIP Signal"}</button>
    </form>
    {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/30 p-3 text-sm text-red-200">{error}</p>}{message && <p role="status" className="mt-4 rounded-xl border border-border bg-surface p-3 text-sm">{message}</p>}
    <h2 className="mt-8 text-lg font-bold">Signal history</h2>
    {loading ? <p className="mt-3 text-sm text-muted">Loading…</p> : signals.length === 0 ? <p className="mt-3 text-sm text-muted">No signals have been published.</p> : <div className="mt-3 space-y-3">{signals.map((signal) => <article key={signal.id} className="rounded-xl border border-border bg-surface p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{signal.symbol} {signal.side} · {signal.timeframe}</p><p className="mt-1 text-xs text-muted">{new Date(signal.publishedAt).toLocaleString("en-NG")} · {signal.status} · by {signal.createdBy.name}</p></div>{signal.status === "ACTIVE" && <div className="flex gap-2"><button type="button" disabled={busy} onClick={() => void closeSignal(signal, "CLOSED")} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold">Close with update</button><button type="button" disabled={busy} onClick={() => void closeSignal(signal, "CANCELLED")} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-rose-300">Cancel</button></div>}</div><p className="mt-3 text-sm leading-6 text-muted">Entry {signal.entryLow}–{signal.entryHigh} · SL {signal.stopLoss} · TP {signal.takeProfits.join(" / ")}</p><p className="mt-2 whitespace-pre-wrap text-sm">{signal.thesis}</p>{signal.outcomeNote && <p className="mt-2 text-sm text-muted">Update: {signal.outcomeNote}</p>}</article>)}</div>}
  </section>;
}
