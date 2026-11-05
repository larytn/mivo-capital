"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type Account = {
  id: string; server: string; loginHint: string; accountCurrency: string; balance: number | null; equity: number | null;
  tradeMode: string; marginMode: string; connectionStatus: string; copyFactoryEnabled: boolean; createdAt: string;
};
type Relationship = {
  id: string; status: string; riskPercent: number; copierShareRateAtStart: number; providerShareRateAtStart: number; mivoShareRateAtStart: number; profitSplitVersion: number; lastError: string | null;
  account: Pick<Account, "id" | "server" | "loginHint" | "accountCurrency" | "balance" | "equity" | "connectionStatus">;
  profile: { id: string; status: string; profitSplitVersion: number; copyFactoryStatus: string; copierProfitShareRate: number; user: { name: string } };
};
type ApiData = { accounts?: Account[]; relationships?: Relationship[]; liveCopyEnabled?: boolean; error?: string };
const field = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent";
const money = (value: number | null, currency: string) => value == null ? "—" : `${new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(value)} ${currency}`;

export default function MyCopyTradingPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [liveCopyEnabled, setLiveCopyEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ server: "", login: "", password: "" });
  const [consent, setConsent] = useState(false);
  const [transactionId, setTransactionId] = useState("");

  const load = useCallback(async () => {
    try {
      const [overviewResponse, accountsResponse] = await Promise.all([
        fetch("/api/copy-trading", { cache: "no-store" }),
        fetch("/api/copy-trading/accounts", { cache: "no-store" }),
      ]);
      if (overviewResponse.status === 401 || accountsResponse.status === 401) { window.location.assign("/login"); return; }
      const overview = await overviewResponse.json() as ApiData;
      const accountData = await accountsResponse.json() as ApiData;
      if (!overviewResponse.ok) throw new Error(overview.error || "Unable to load live copy relationships.");
      if (!accountsResponse.ok) throw new Error(accountData.error || "Unable to check live account status.");
      setAccounts(Array.isArray(accountData.accounts) ? accountData.accounts : []);
      setRelationships(Array.isArray(overview.relationships) ? overview.relationships : []);
      setLiveCopyEnabled(accountData.liveCopyEnabled === true);
      setError("");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load your live copy accounts."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function linkAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/copy-trading/accounts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, consent, ...(transactionId ? { transactionId } : {}) }),
      });
      const data = await response.json() as { pending?: boolean; transactionId?: string; retryAfter?: string | null; message?: string; error?: string };
      if (response.status === 401) { window.location.assign("/login"); return; }
      if (response.status === 202 && data.pending) {
        setTransactionId(data.transactionId || "");
        setNotice(data.message || "MetaApi is checking the account. Retry shortly using the same request.");
        return;
      }
      if (!response.ok) throw new Error(data.error || "Unable to link this account.");
      setForm({ server: "", login: "", password: "" }); setConsent(false); setTransactionId("");
      setNotice(data.message || "Live account linked."); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to link this account."); }
    finally { setBusy(false); }
  }

  async function manage(relationship: Relationship, action: "pause" | "resume" | "stop") {
    if (action === "stop" && !window.confirm("Stop this live copy relationship? New entries will stop. Open positions will follow the provider's graceful exit settings.")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/copy-trading/live", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ relationshipId: relationship.id, action }) });
      const data = await response.json() as { message?: string; error?: string };
      if (response.status === 401) { window.location.assign("/login"); return; }
      if (!response.ok) throw new Error(data.error || "Unable to update live copying.");
      setNotice(data.message || "Live copy relationship updated."); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to update live copying."); }
    finally { setBusy(false); }
  }

  return <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
    <p className="text-xs font-bold uppercase tracking-[.16em] text-accent">Live broker connections</p>
    <h1 className="mt-2 text-2xl font-bold sm:text-3xl">My Copy Trading</h1>
    <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">Link your own real MT5 copier account, choose a live provider in Copy Trading, read the provider’s profit offer, then confirm before that provider’s trades can be sent to your account.</p>
    <div className="mt-4 rounded-xl border border-amber-300/25 bg-amber-300/5 p-4 text-xs leading-5 text-amber-100/90"><strong>How it works:</strong> your real MT5 account is linked to MetaApi with your trading password; Mivo does not save the password. The provider’s source account uses read-only access. Before copying, you accept the provider’s chosen share. For each $100 of eligible profit, Mivo receives $10, you receive the agreed copier share, and the provider receives the remaining amount. Eligible profit is measured monthly above the prior high-water mark. Copying can lose money.</div>
    {error && <p role="alert" className="mt-4 rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
    {notice && <p role="status" className="mt-4 rounded-lg border border-border bg-surface p-3 text-sm">{notice}</p>}

    <section className="mt-6 rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">Your live MT5 accounts</h2><p className="mt-1 text-sm text-muted">Credentials are sent to MetaApi for secure connection and are not saved in Mivo’s database.</p></div><button type="button" onClick={() => void load()} disabled={busy} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold">Refresh status</button></div>
      {!liveCopyEnabled && <p className="mt-4 rounded-lg border border-amber-300/25 bg-amber-300/5 p-3 text-sm text-amber-100">Live copying is not enabled for this Mivo environment yet. MetaApi CopyFactory must be enabled and configured by Mivo before accounts can be linked.</p>}
      {loading ? <p className="mt-4 text-sm text-muted">Checking account connections…</p> : accounts.length === 0 ? <p className="mt-4 text-sm text-muted">No live copy accounts are linked yet.</p> : <div className="mt-4 grid gap-3 md:grid-cols-2">{accounts.map((account) => <article key={account.id} className="rounded-xl border border-border bg-background p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{account.server}</p><p className="mt-1 text-xs text-muted">{account.loginHint} · {account.tradeMode === "ACCOUNT_TRADE_MODE_REAL" ? "Real" : account.tradeMode.replaceAll("ACCOUNT_TRADE_MODE_", "")}</p></div><span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${account.connectionStatus === "CONNECTED" ? "border-emerald-300/25 text-emerald-300" : "border-amber-300/25 text-amber-200"}`}>{account.connectionStatus.replaceAll("_", " ")}</span></div><div className="mt-3 grid grid-cols-2 gap-3 text-xs"><p><span className="text-muted">Balance</span><br /><strong className="tabular-nums">{money(account.balance, account.accountCurrency)}</strong></p><p><span className="text-muted">Equity</span><br /><strong className="tabular-nums">{money(account.equity, account.accountCurrency)}</strong></p></div><p className="mt-3 text-[11px] text-muted">{account.marginMode.replaceAll("ACCOUNT_MARGIN_MODE_", "")} · {account.copyFactoryEnabled ? "CopyFactory enabled" : "CopyFactory not enabled"}</p></article>)}</div>}

      <form onSubmit={linkAccount} className="mt-5 border-t border-border pt-5">
        <h3 className="text-sm font-semibold">Link a copier account</h3>
        <p className="mt-1 text-xs leading-5 text-muted">Use your existing real MT5 account’s master/trading password, not the investor/read-only password. MetaApi verifies the server, login, real-account status, trading permission and hedging mode. The password is sent to MetaApi for connection and is not saved in Mivo’s database.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3"><label className="text-xs font-semibold text-muted">MT5 server<input required className={`${field} mt-1.5`} value={form.server} onChange={(event) => setForm({ ...form, server: event.target.value })} placeholder="Broker-Real" /></label><label className="text-xs font-semibold text-muted">Account login<input required inputMode="numeric" className={`${field} mt-1.5`} value={form.login} onChange={(event) => setForm({ ...form, login: event.target.value })} /></label><label className="text-xs font-semibold text-muted">Trading password<input required type="password" autoComplete="off" className={`${field} mt-1.5`} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label></div>
        <label className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 accent-accent" /><span>I authorize Mivo and MetaApi to connect this real trading account and submit or manage trades for each copy relationship I explicitly start. I understand copied orders and the agreed profit split can affect my real account balance; I can pause or stop copying.</span></label>
        <button type="submit" disabled={busy || !consent || !liveCopyEnabled} className="mt-3 rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-50">{busy ? "Connecting…" : transactionId ? "Retry secure connection" : "Link live MT5 account"}</button>
      </form>
    </section>

    <section className="mt-7">
      <h2 className="text-lg font-bold">Provider relationships</h2>
      <p className="mt-1 text-sm text-muted">Each provider is managed independently. Pausing blocks new entries while letting active copied positions receive close signals.</p>
      {loading ? <p className="mt-4 text-sm text-muted">Loading relationships…</p> : relationships.length === 0 ? <div className="mt-4 rounded-2xl border border-dashed border-border p-6"><p className="font-semibold">You are not copying a provider</p><p className="mt-1 text-sm text-muted">Link your real account, then choose a provider from Copy Trading.</p></div> : <div className="mt-4 space-y-3">{relationships.map((relationship) => <article key={relationship.id} className="rounded-2xl border border-border bg-surface p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{relationship.profile.user.name}</p><p className="mt-1 text-xs text-muted">{relationship.account.server} {relationship.account.loginHint} · {relationship.account.accountCurrency}</p><p className="mt-1 text-xs text-muted">Status: {relationship.status.replaceAll("_", " ")} · max risk {relationship.riskPercent}% per copied trade · {relationship.profitSplitVersion === 2 ? `copier ${Math.round(relationship.copierShareRateAtStart * 100)}% · Mivo ${Math.round(relationship.mivoShareRateAtStart * 100)}% · provider ${Math.round(relationship.providerShareRateAtStart * 100)}%` : "started under previous profit terms; review with Mivo"}</p>{relationship.status === "PAUSED" && (relationship.profile.status !== "APPROVED" || relationship.profile.profitSplitVersion !== 2 || relationship.profile.copyFactoryStatus !== "ACTIVE") && <p className="mt-2 text-xs text-amber-200">This provider is unavailable. Review its current approval and profit terms before restarting.</p>}</div><div className="flex flex-wrap gap-2">{relationship.status === "ACTIVE" && <button type="button" disabled={busy} onClick={() => void manage(relationship, "pause")} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold">Pause</button>}{relationship.status === "PAUSED" && <button type="button" disabled={busy || relationship.profile.status !== "APPROVED" || relationship.profile.profitSplitVersion !== 2 || relationship.profile.copyFactoryStatus !== "ACTIVE"} onClick={() => void manage(relationship, "resume")} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold disabled:opacity-50">Resume</button>}{["ACTIVE", "PAUSED", "ERROR"].includes(relationship.status) && <button type="button" disabled={busy} onClick={() => void manage(relationship, "stop")} className="rounded-lg border border-rose-300/25 px-3 py-2 text-xs font-semibold text-rose-200">Stop</button>}</div></div>{relationship.lastError && <p className="mt-3 rounded-lg border border-rose-300/25 bg-rose-300/5 p-3 text-xs text-rose-200">{relationship.lastError}</p>}</article>)}</div>}
    </section>
  </main>;
}
