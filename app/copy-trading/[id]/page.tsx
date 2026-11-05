"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type Performance = { verified: boolean; sourceLabel: string; netPnl: number | null; maxDrawdown: number | null; winRate: number | null; profitFactor: number | null; profitFactorInfinite: boolean; totalTrades: number | null; lastSyncedAt: string | null; curve: Array<{ date: string; value: number }> };
type Trade = { id: string; symbol: string; direction: string; status: string; entryPrice: number; exitPrice: number | null; stopLoss: number | null; takeProfit: number | null; currentPrice: number | null; openedAt: string; closedAt: string | null };
type Account = { id: string; server: string; loginHint: string; accountCurrency: string; balance: number | null; equity: number | null; connectionStatus?: string };
type Detail = { profile: { id: string; name: string; bio: string; strategy: string; markets: string; followerCount: number; copierProfitShareRate: number; createdAt: string }; performance: Performance; trades: Trade[]; relationship: { id: string; status: string; accountId: string; riskPercent: number } | null; accounts: Account[]; liveCopyEnabled: boolean; error?: string };
const field = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent";
const number = (value: number | null | undefined, digits = 2) => value == null ? "—" : new Intl.NumberFormat("en", { maximumFractionDigits: digits }).format(value);
const price = (value: number | null) => value == null ? "—" : new Intl.NumberFormat("en", { maximumFractionDigits: 5 }).format(value);

export default function ProviderDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [consent, setConsent] = useState(false);
  const [confirmation, setConfirmation] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [riskPercent, setRiskPercent] = useState("1");

  const load = useCallback(async () => {
    try {
      const [profileResponse, accountResponse] = await Promise.all([
        fetch(`/api/copy-trading/${encodeURIComponent(params.id)}`, { cache: "no-store" }),
        fetch("/api/copy-trading/accounts", { cache: "no-store" }),
      ]);
      if (profileResponse.status === 401 || accountResponse.status === 401) { window.location.href = "/login"; return; }
      const profileData = await profileResponse.json() as Detail;
      const accountData = await accountResponse.json() as { accounts?: Account[]; liveCopyEnabled?: boolean; error?: string };
      if (!profileResponse.ok) throw new Error(profileData.error || "Unable to load provider profile.");
      if (!accountResponse.ok) throw new Error(accountData.error || "Unable to check linked MT5 accounts.");
      const availableAccounts = Array.isArray(accountData.accounts) ? accountData.accounts.filter((account) => account.connectionStatus === "CONNECTED") : [];
      setData({ ...profileData, accounts: availableAccounts, liveCopyEnabled: accountData.liveCopyEnabled === true });
      setAccountId((current) => availableAccounts.some((account) => account.id === current) ? current : availableAccounts[0]?.id ?? "");
      setError("");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load provider profile."); }
    finally { setLoading(false); }
  }, [params.id]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function start() {
    if (!data) return;
    if (!confirmation) { setConfirmation(true); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/copy-trading/live", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start", profileId: data.profile.id, accountId, riskPercent: Number(riskPercent), consent }) });
      const result = await response.json() as { message?: string; error?: string };
      if (response.status === 401) { window.location.href = "/login"; return; }
      if (!response.ok) throw new Error(result.error || "Unable to start live copying.");
      setNotice(result.message || "Live copying started."); setConfirmation(false); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to start live copying."); }
    finally { setBusy(false); }
  }

  const performance = data?.performance;
  const curvePath = useMemo(() => {
    const points = performance?.curve ?? [];
    if (points.length < 2) return "";
    const values = points.map((point) => point.value);
    const min = Math.min(...values, 0), max = Math.max(...values, 0), span = Math.max(max - min, 1);
    return points.map((point, index) => `${index === 0 ? "M" : "L"}${(index / (points.length - 1)) * 600},${190 - ((point.value - min) / span) * 180}`).join(" ");
  }, [performance?.curve]);
  const selectedAccount = data?.accounts.find((account) => account.id === accountId);
  const copierPercent = data ? Math.round(data.profile.copierProfitShareRate * 100) : 0;
  const providerPercent = 90 - copierPercent;

  if (loading) return <main className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted">Loading provider profile…</main>;
  if (!data) return <main className="mx-auto max-w-6xl px-4 py-8"><p role="alert" className="rounded-xl border border-rose-400/30 p-4 text-sm text-rose-200">{error || "Provider not found."}</p><Link href="/copy-trading" className="mt-4 inline-block text-sm font-semibold text-accent">Back to Copy Trading</Link></main>;
  const perf = data.performance;

  return <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
    <Link href="/copy-trading" className="text-sm font-semibold text-accent">← Copy Trading</Link>
    <div className="mt-4 flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-accent">Live MT5 provider</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">{data.profile.name}</h1><p className="mt-2 text-sm text-muted">{data.profile.markets} · {data.profile.followerCount} live followers</p></div><span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${perf.verified ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-border text-muted"}`}>{perf.verified ? "Verified MT5 history" : "No verified broker history"}</span></div>
    {error && <p role="alert" className="mt-4 rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}{notice && <p role="status" className="mt-4 rounded-lg border border-border bg-surface p-3 text-sm">{notice}</p>}
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[
      ["Net P&L", perf.verified ? number(perf.netPnl) : "—"], ["Max drawdown", perf.verified ? number(perf.maxDrawdown) : "—"], ["Win rate", perf.verified ? `${number(perf.winRate, 1)}%` : "—"], ["Profit factor", perf.verified ? perf.profitFactorInfinite ? "∞" : number(perf.profitFactor) : "—"], ["Closed trades", perf.verified ? String(perf.totalTrades) : "—"],
    ].map(([label, value]) => <div key={label} className="rounded-xl border border-border bg-surface p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p><p className="mt-1 text-lg font-semibold tabular-nums">{value}</p></div>)}</div>
    <section className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]"><article className="rounded-xl border border-border bg-surface p-4"><div className="flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">Verified net P&amp;L curve</h2><span className="text-xs text-muted">{perf.verified ? "Broker account units" : "Unavailable"}</span></div>{perf.verified && curvePath ? <svg className="mt-3 h-52 w-full" viewBox="0 0 600 200" role="img" aria-label="Cumulative verified broker net profit and loss curve" preserveAspectRatio="none"><path d="M 0 100 H 600" stroke="currentColor" className="text-border" strokeDasharray="4 5" /><path d={curvePath} fill="none" stroke="currentColor" className="text-accent" strokeWidth="2.5" vectorEffect="non-scaling-stroke" /></svg> : <div className="mt-3 flex h-52 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted">Connected broker history is needed to display verified performance.</div>}<p className="mt-2 text-xs leading-5 text-muted">Aggregated from MT5 synced closed trades while the provider connection is active. Currency is not inferred when the account record does not establish it.</p></article><article className="rounded-xl border border-border bg-surface p-4"><h2 className="text-sm font-semibold">Strategy and provider</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted">{data.profile.bio}</p><h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Method and risk approach</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{data.profile.strategy}</p><div className="mt-4 rounded-lg border border-border bg-background p-3 text-sm"><p><span className="text-muted">Profit split:</span> <strong>Copier {copierPercent}% · Mivo 10% · Provider {providerPercent}%</strong></p><p className="mt-1 text-xs leading-5 text-muted">These percentages apply to eligible profit. Mivo’s 10% is reserved first; the provider chose your share before you start. The remaining amount goes to the provider. Profit is measured by the monthly high-water mark.</p></div></article></section>
    <section className="mt-5 rounded-xl border border-border bg-surface p-4"><div><h2 className="text-base font-semibold">Provider trading history</h2><p className="mt-1 text-xs text-muted">Only trades the provider has individually shared are listed here. Manual journal entries are self-reported.</p></div>{data.trades.length === 0 ? <p className="mt-4 rounded-lg border border-dashed border-border p-5 text-sm text-muted">No public trade history has been shared.</p> : <div className="mt-3 overflow-x-auto rounded-lg border border-border"><table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-background/60 text-[10px] uppercase tracking-wide text-muted"><tr><th className="px-3 py-2.5">Opened</th><th className="px-3 py-2.5">Market</th><th className="px-3 py-2.5">Side</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5">Entry</th><th className="px-3 py-2.5">Exit</th><th className="px-3 py-2.5">Stop / target</th></tr></thead><tbody className="divide-y divide-border">{data.trades.map((trade) => <tr key={trade.id}><td className="px-3 py-2.5 text-xs text-muted">{new Date(trade.openedAt).toLocaleDateString()}</td><td className="px-3 py-2.5 font-medium">{trade.symbol}</td><td className="px-3 py-2.5">{trade.direction}</td><td className="px-3 py-2.5 text-xs">{trade.status}</td><td className="px-3 py-2.5 tabular-nums">{price(trade.entryPrice)}</td><td className="px-3 py-2.5 tabular-nums">{price(trade.exitPrice)}</td><td className="px-3 py-2.5 text-xs tabular-nums">{price(trade.stopLoss)} / {price(trade.takeProfit)}</td></tr>)}</tbody></table></div>}</section>
    <section className="mt-5 rounded-xl border border-accent/25 bg-surface p-4 sm:p-5"><h2 className="text-base font-semibold">Start live copying</h2><p className="mt-1 text-sm text-muted">Trades will be sent by MetaApi CopyFactory to the real MT5 account you select.</p>
      {!data.liveCopyEnabled ? <p className="mt-4 rounded-lg border border-amber-300/25 bg-amber-300/5 p-4 text-sm text-amber-100">Mivo has not enabled the paid CopyFactory service for this environment yet.</p> : data.accounts.length === 0 ? <div className="mt-4 rounded-lg border border-dashed border-border p-4"><p className="text-sm">Link a real, trade-enabled MT5 account before copying.</p><Link href="/copy-trading/my" className="mt-2 inline-block text-sm font-semibold text-accent">Link live account →</Link></div> : data.relationship && data.relationship.status !== "STOPPED" ? <div className="mt-4 rounded-lg border border-border p-4"><p className="text-sm">You have a <strong>{data.relationship.status.toLowerCase()}</strong> live relationship with this provider.</p><Link href="/copy-trading/my" className="mt-3 inline-block rounded-lg bg-foreground px-3.5 py-2 text-sm font-semibold text-background">Manage in My Copy Trading</Link></div> : <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-muted">Real MT5 account<select disabled={confirmation} className={`${field} mt-1 block w-full`} value={accountId} onChange={(event) => setAccountId(event.target.value)}>{data.accounts.map((account) => <option key={account.id} value={account.id}>{account.server} {account.loginHint} · equity {number(account.equity)} {account.accountCurrency}</option>)}</select></label><label className="text-xs font-semibold text-muted">Maximum risk per copied trade (%)<select disabled={confirmation} className={`${field} mt-1 block w-full`} value={riskPercent} onChange={(event) => setRiskPercent(event.target.value)}><option value="0.1">0.1%</option><option value="0.25">0.25%</option><option value="0.5">0.5%</option><option value="1">1%</option><option value="1.5">1.5%</option><option value="2">2%</option></select></label>
        <div className="rounded-lg border border-border bg-background p-3 text-xs leading-5 sm:col-span-2"><p className="font-semibold">Profit split on eligible profit</p><p className="mt-1 text-muted">Copier receives {copierPercent}% · Mivo receives 10% · provider receives {providerPercent}%. For each $100 of eligible profit, that is ${copierPercent} to you, $10 to Mivo, and ${providerPercent} to the provider.</p></div>
        <label className="flex items-start gap-2 text-xs leading-5 text-muted sm:col-span-2"><input type="checkbox" disabled={confirmation} checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 accent-accent" /><span>I authorize live orders on this real account for this provider, understand that losses are possible, and agree to the provider’s {copierPercent}% copier share, Mivo’s 10% share, and the provider’s {providerPercent}% share of eligible profit. Copying starts only after I review and confirm these terms.</span></label>
        {confirmation && <div className="rounded-lg border border-accent/25 bg-accent/5 p-3 text-sm sm:col-span-2"><p className="font-semibold">Review before starting</p><p className="mt-1 text-xs leading-5 text-muted">Real account: {selectedAccount?.server} {selectedAccount?.loginHint} · {riskPercent}% maximum risk per copied trade · profit split: copier {copierPercent}%, Mivo 10%, provider {providerPercent}%.</p></div>}
        <div className="flex flex-wrap gap-2 sm:col-span-2"><button type="button" disabled={busy || !consent || !accountId} onClick={() => void start()} className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-50">{busy ? "Connecting…" : confirmation ? "Confirm live copying" : "Review live settings"}</button>{confirmation && <button type="button" onClick={() => setConfirmation(false)} className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold">Edit settings</button>}</div></div>}
    </section>
    <p className="mt-5 text-xs leading-5 text-muted">Copying depends on provider and follower account connectivity, broker execution, slippage, symbols available at each broker and MetaApi CopyFactory availability. Positions may differ between accounts. Provider history is not a guarantee of future results.</p>
  </main>;
}
