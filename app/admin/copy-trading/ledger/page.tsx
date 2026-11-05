"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type LedgerEvent = {
  id: string;
  action: string;
  amount: number;
  currency: string;
  reference: string;
  createdAt: string;
  admin: { name: string };
};

type LedgerEntry = {
  id: string;
  transactionAt: string;
  currency: string;
  symbol: string | null;
  positionId: string | null;
  profit: number;
  improvement: number;
  eligibleProfit: number;
  copierProfitShareRate: number;
  mivoProfitShareRate: number;
  copierShareAmount: number;
  providerShareAmount: number;
  providerCommission: number;
  mivoShareAmount: number;
  copyFactoryPlatformCommission: number;
  collectionStatus: string;
  collectionReference: string | null;
  providerPayoutStatus: string;
  providerPayoutReference: string | null;
  mivoReceiptStatus: string;
  mivoReceiptReference: string | null;
  profile: { user: { name: string } };
  account: { server: string; loginHint: string; accountCurrency: string; user: { name: string } };
  relationship: { follower: { name: string } } | null;
  events: LedgerEvent[];
};

type LedgerResponse = { entries?: LedgerEntry[]; error?: string };
type SyncResponse = {
  error?: string;
  synced?: number;
  updated?: number;
  skipped?: number;
  unmatched?: number;
  unresolvedProfiles?: number;
  settledSourceChanged?: number;
  pageLimitReached?: boolean;
  message?: string;
};
type SettlementAction = "record_collection" | "record_provider_payout" | "record_mivo_receipt";
type References = { collection: string; provider: string; mivo: string };

const defaultReferences = (): References => ({ collection: "", provider: "", mivo: "" });
const utcDateInput = (date: Date) => date.toISOString().slice(0, 10);
const amount = (value: number, currency: string) => `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
const actionField: Record<SettlementAction, keyof References> = {
  record_collection: "collection",
  record_provider_payout: "provider",
  record_mivo_receipt: "mivo",
};

function dateRange() {
  const today = new Date();
  const from = new Date(today);
  from.setUTCDate(from.getUTCDate() - 30);
  return { from: utcDateInput(from), till: utcDateInput(today) };
}

export default function CopyTradingLedgerPage() {
  const initialRange = useMemo(() => dateRange(), []);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [references, setReferences] = useState<Record<string, References>>({});
  const [from, setFrom] = useState(initialRange.from);
  const [till, setTill] = useState(initialRange.till);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/copy-trading/ledger", { cache: "no-store" });
      if (response.status === 401 || response.status === 403) { window.location.href = "/admin/login"; return; }
      const data = await response.json() as LedgerResponse;
      if (!response.ok) throw new Error(data.error || "Unable to load the commission ledger.");
      setEntries(Array.isArray(data.entries) ? data.entries : []);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load the commission ledger.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function syncHistory() {
    setBusy("sync"); setError(""); setNotice("");
    try {
      const endExclusive = new Date(`${till}T00:00:00.000Z`);
      endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
      const response = await fetch("/api/admin/copy-trading/ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync", from: `${from}T00:00:00.000Z`, till: endExclusive.toISOString() }),
      });
      const data = await response.json() as SyncResponse;
      if (!response.ok) throw new Error(data.error || "Unable to sync CopyFactory history.");
      const warnings = [
        data.unmatched ? `${data.unmatched} transaction(s) did not match a local live account` : "",
        data.unresolvedProfiles ? `${data.unresolvedProfiles} provider region(s) could not be checked` : "",
        data.settledSourceChanged ? `${data.settledSourceChanged} already-recorded settlement(s) differ from current CopyFactory amounts and were left unchanged` : "",
        data.pageLimitReached ? "The history page limit was reached; sync a shorter period to finish" : "",
      ].filter(Boolean);
      setNotice(`${data.message || "History sync complete."} Added ${data.synced ?? 0}, refreshed ${data.updated ?? 0}, skipped ${data.skipped ?? 0}.${warnings.length ? ` ${warnings.join("; ")}.` : ""}`);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to sync CopyFactory history.");
    } finally {
      setBusy(null);
    }
  }

  async function record(entry: LedgerEntry, action: SettlementAction) {
    const key = actionField[action];
    const reference = references[entry.id]?.[key]?.trim() || "";
    if (reference.length < 3) { setError("Enter the payment or accounting reference before recording a settlement."); return; }
    setBusy(`${entry.id}:${action}`); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/copy-trading/ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entry.id, action, reference }),
      });
      const data = await response.json() as { error?: string; amount?: number; currency?: string };
      if (!response.ok) throw new Error(data.error || "Unable to record this settlement.");
      setNotice(`Settlement record saved for ${amount(data.amount ?? 0, data.currency || entry.currency)}. No transfer was initiated by Mivo.`);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to record this settlement.");
    } finally {
      setBusy(null);
    }
  }

  const totals = useMemo(() => {
    const byCurrency = new Map<string, { eligible: number; copier: number; provider: number; mivo: number; pendingCollections: number; pendingProvider: number; pendingMivo: number }>();
    for (const entry of entries) {
      const total = byCurrency.get(entry.currency) ?? { eligible: 0, copier: 0, provider: 0, mivo: 0, pendingCollections: 0, pendingProvider: 0, pendingMivo: 0 };
      total.eligible += entry.eligibleProfit;
      total.copier += entry.copierShareAmount;
      total.provider += entry.providerShareAmount;
      total.mivo += entry.mivoShareAmount;
      if (entry.collectionStatus !== "RECORDED" && entry.providerShareAmount + entry.mivoShareAmount > 0) total.pendingCollections += 1;
      if (entry.providerPayoutStatus !== "RECORDED" && entry.providerShareAmount > 0) total.pendingProvider += 1;
      if (entry.mivoReceiptStatus !== "RECORDED" && entry.mivoShareAmount > 0) total.pendingMivo += 1;
      byCurrency.set(entry.currency, total);
    }
    return [...byCurrency.entries()];
  }, [entries]);

  function updateReference(id: string, field: keyof References, value: string) {
    setReferences((current) => ({ ...current, [id]: { ...defaultReferences(), ...current[id], [field]: value } }));
  }

  function actionPanel(entry: LedgerEntry, action: SettlementAction, label: string, existingReference: string | null, status: string, value: number) {
    const key = actionField[action];
    const canRecord = value > 0 && (action === "record_collection" || entry.collectionStatus === "RECORDED");
    return <div className="min-w-52 rounded-lg border border-border bg-background/50 p-3">
      <div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold">{label}</p><span className={`text-[10px] ${status === "RECORDED" ? "text-emerald-300" : "text-amber-300"}`}>{status === "RECORDED" ? "Recorded" : "Pending"}</span></div>
      <p className="mt-1 text-xs tabular-nums">{amount(value, entry.currency)}</p>
      {status === "RECORDED" ? <p className="mt-2 break-all text-[10px] text-muted">Ref: {existingReference || "—"}</p> : <>
        <input
          aria-label={`${label} reference for ${entry.account.user.name}`}
          value={references[entry.id]?.[key] ?? ""}
          onChange={(event) => updateReference(entry.id, key, event.target.value)}
          maxLength={200}
          placeholder="Transfer / receipt reference"
          className="mt-2 w-full rounded-md border border-border bg-background px-2.5 py-2 text-xs text-foreground outline-none focus:border-accent"
        />
        <button
          type="button"
          disabled={!canRecord || busy === `${entry.id}:${action}` || (references[entry.id]?.[key] ?? "").trim().length < 3}
          onClick={() => void record(entry, action)}
          className="mt-2 w-full rounded-md border border-border px-2.5 py-2 text-[11px] font-semibold disabled:opacity-40"
        >{busy === `${entry.id}:${action}` ? "Saving…" : action === "record_collection" ? "Record collection" : action === "record_provider_payout" ? "Record payout" : "Record receipt"}</button>
        {action !== "record_collection" && entry.collectionStatus !== "RECORDED" && <p className="mt-1 text-[10px] text-muted">Record collection first.</p>}
      </>}
    </div>;
  }

  return <section className="max-w-6xl">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Copy trading · Finance</p><h1 className="mt-2 text-2xl font-bold">Profit split ledger</h1><p className="mt-2 max-w-3xl text-sm leading-5 text-muted">Sync eligible profit from CopyFactory, then record collections, provider payouts and Mivo receipts with their references.</p></div>
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-surface p-3">
        <label className="text-[11px] text-muted">From<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1 block rounded-md border border-border bg-background px-2.5 py-2 text-xs text-foreground" /></label>
        <label className="text-[11px] text-muted">Through<input type="date" value={till} onChange={(event) => setTill(event.target.value)} className="mt-1 block rounded-md border border-border bg-background px-2.5 py-2 text-xs text-foreground" /></label>
        <button type="button" disabled={busy === "sync" || !from || !till} onClick={() => void syncHistory()} className="rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-accent-foreground disabled:opacity-50">{busy === "sync" ? "Syncing…" : "Sync CopyFactory"}</button>
      </div>
    </div>

    <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm leading-5 text-muted">
      Each ledger split uses eligible high-water-mark profit: Mivo receives 10% of the full amount, the copier receives the provider’s agreed percentage, and the provider receives the rest of the 90%. The CopyFactory commission and platform amounts are stored as source values for reconciliation. Syncing updates the ledger only; it does not collect funds or send payouts. Admins record settlement references after transfers are made.
    </div>
    {error && <p role="alert" className="mt-4 rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
    {notice && <p role="status" className="mt-4 rounded-lg border border-border bg-surface p-3 text-sm">{notice}</p>}

    {totals.length > 0 && <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{totals.map(([currency, total]) => <article key={currency} className="rounded-xl border border-border bg-surface p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted">Visible ledger totals · {currency}</p><div className="mt-3 grid grid-cols-2 gap-2"><div><p className="text-[10px] text-muted">Eligible profit</p><p className="mt-1 text-sm font-semibold tabular-nums">{amount(total.eligible, currency)}</p></div><div><p className="text-[10px] text-muted">Copier share</p><p className="mt-1 text-sm font-semibold tabular-nums">{amount(total.copier, currency)}</p></div><div><p className="text-[10px] text-muted">Provider payout</p><p className="mt-1 text-sm font-semibold tabular-nums">{amount(total.provider, currency)}</p></div><div><p className="text-[10px] text-muted">Mivo share</p><p className="mt-1 text-sm font-semibold tabular-nums">{amount(total.mivo, currency)}</p></div></div><p className="mt-3 text-[10px] leading-4 text-muted">Pending: {total.pendingCollections} collection(s), {total.pendingProvider} provider payout(s), {total.pendingMivo} Mivo receipt(s).</p></article>)}</div>}

    {loading ? <p className="mt-6 text-sm text-muted">Loading commission records…</p> : entries.length === 0 ? <div className="mt-5 rounded-xl border border-dashed border-border p-7 text-center"><h2 className="font-semibold">No commission records yet</h2><p className="mt-1 text-sm text-muted">Once the paid CopyFactory service is enabled and live relationships create commission history, sync a date range to add it here.</p></div> : <>
      <div className="mt-5 flex items-center justify-between gap-3"><h2 className="text-sm font-semibold">Recent commission transactions</h2><span className="text-[11px] text-muted">Showing up to 500 most recent entries</span></div>
      <div className="mt-3 space-y-4">{entries.map((entry) => {
        const collectedAmount = entry.providerShareAmount + entry.mivoShareAmount;
        const providerPayoutAmount = entry.providerShareAmount;
        const copier = entry.relationship?.follower.name || entry.account.user.name;
        return <article key={entry.id} className="rounded-xl border border-border bg-surface p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">{entry.symbol || "Commission transaction"}</h3><span className="rounded-full border border-border px-2 py-0.5 text-[10px]">{entry.currency}</span></div><p className="mt-1 text-xs text-muted">{new Date(entry.transactionAt).toLocaleString()} · Position {entry.positionId || "—"}</p></div><div className="text-right"><p className="text-[10px] uppercase tracking-wide text-muted">CopyFactory profit</p><p className="mt-1 text-sm font-semibold tabular-nums">{amount(entry.profit, entry.currency)}</p></div></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><div className="rounded-lg border border-border p-3"><p className="text-[10px] uppercase tracking-wide text-muted">Eligible profit</p><p className="mt-1 text-sm font-semibold tabular-nums">{amount(entry.eligibleProfit, entry.currency)}</p><p className="mt-1 text-[11px] text-muted">High-water-mark basis</p></div><div className="rounded-lg border border-border p-3"><p className="text-[10px] uppercase tracking-wide text-muted">Copier account</p><p className="mt-1 text-sm font-semibold">{copier}</p><p className="mt-1 text-[11px] text-muted">{entry.account.server} · {entry.account.loginHint}</p></div><div className="rounded-lg border border-border p-3"><p className="text-[10px] uppercase tracking-wide text-muted">Copier share · {Math.round(entry.copierProfitShareRate * 100)}%</p><p className="mt-1 text-sm font-semibold tabular-nums">{amount(entry.copierShareAmount, entry.currency)}</p></div><div className="rounded-lg border border-border p-3"><p className="text-[10px] uppercase tracking-wide text-muted">Mivo share · {Math.round(entry.mivoProfitShareRate * 100)}% of eligible profit</p><p className="mt-1 text-sm font-semibold tabular-nums">{amount(entry.mivoShareAmount, entry.currency)}</p><p className="mt-1 text-[11px] text-muted">CopyFactory platform amount: {amount(entry.copyFactoryPlatformCommission, entry.currency)}</p></div><div className="rounded-lg border border-border p-3"><p className="text-[10px] uppercase tracking-wide text-muted">Provider share</p><p className="mt-1 text-sm font-semibold tabular-nums">{amount(providerPayoutAmount, entry.currency)}</p><p className="mt-1 text-[11px] text-muted">CopyFactory commission source: {amount(entry.providerCommission, entry.currency)}</p></div></div>
          <div className="mt-3 grid gap-3 xl:grid-cols-3">
            {actionPanel(entry, "record_collection", "Copier collection", entry.collectionReference, entry.collectionStatus, collectedAmount)}
            {actionPanel(entry, "record_provider_payout", "Provider payout · after Mivo share", entry.providerPayoutReference, entry.providerPayoutStatus, providerPayoutAmount)}
            {actionPanel(entry, "record_mivo_receipt", "Mivo receipt", entry.mivoReceiptReference, entry.mivoReceiptStatus, entry.mivoShareAmount)}
          </div>
          {entry.events.length > 0 && <details className="mt-3 rounded-lg border border-border px-3 py-2"><summary className="cursor-pointer text-xs font-semibold">Settlement audit history ({entry.events.length})</summary><div className="mt-2 divide-y divide-border">{entry.events.map((event) => <div key={event.id} className="py-2 text-[11px] text-muted"><span className="font-semibold text-foreground">{event.action.replaceAll("_", " ")}</span> · {amount(event.amount, event.currency)} · {event.admin.name} · {new Date(event.createdAt).toLocaleString()} · Ref: {event.reference}</div>)}</div></details>}
        </article>;
      })}</div>
    </>}
  </section>;
}
