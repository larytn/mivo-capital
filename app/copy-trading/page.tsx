"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Performance = { verified: boolean; sourceLabel: string; netPnl: number | null; maxDrawdown: number | null; winRate: number | null; profitFactor: number | null; profitFactorInfinite: boolean; totalTrades: number | null; lastSyncedAt: string | null };
type Trade = { id: string; symbol: string; direction: string; status: string; entryPrice: number; exitPrice: number | null; stopLoss: number | null; takeProfit: number | null; openedAt: string; closedAt: string | null };
type Provider = { id: string; userId: string; bio: string; strategy: string; markets: string; createdAt: string; copierProfitShareRate: number; followerCount: number; isOwn: boolean; performance: Performance; user: { name: string; journalTrades: Trade[] } };
type Data = { profiles?: Provider[]; error?: string };

const number = (value: number | null | undefined, digits = 2) => value == null ? "—" : new Intl.NumberFormat("en", { maximumFractionDigits: digits }).format(value);

export default function CopyTradingPage() {
  const [profiles, setProfiles] = useState<Provider[]>([]);
  const [query, setQuery] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/copy-trading", { cache: "no-store" });
      if (response.status === 401) { window.location.href = "/login"; return; }
      const data = await response.json() as Data;
      if (!response.ok) throw new Error(data.error || "Unable to load providers.");
      setProfiles(Array.isArray(data.profiles) ? data.profiles : []);
      setError("");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load providers."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  const providers = useMemo(() => {
    const search = query.trim().toLowerCase();
    const result = profiles.filter((provider) => (!verifiedOnly || provider.performance.verified)
      && (!search || `${provider.user.name} ${provider.markets} ${provider.strategy}`.toLowerCase().includes(search)));
    if (sort === "followers") result.sort((a, b) => b.followerCount - a.followerCount);
    if (sort === "net-pnl") result.sort((a, b) => (b.performance.netPnl ?? -Infinity) - (a.performance.netPnl ?? -Infinity));
    return result;
  }, [profiles, query, sort, verifiedOnly]);

  return <main className="min-h-screen px-4 py-7 text-foreground sm:px-7 sm:py-9"><div className="mx-auto max-w-6xl">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Mivo Capital · Live MT5</p><h1 className="mt-2 text-2xl font-bold sm:text-3xl">Copy Trading</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Compare approved live providers, review verified broker history and the agreed profit split, then link your real MT5 account and risk limit.</p></div><div className="flex gap-2"><Link href="/copy-trading/provider" className="rounded-lg border border-border px-3.5 py-2.5 text-sm font-semibold hover:bg-surface">Provider portal</Link><Link href="/copy-trading/my" className="rounded-lg bg-foreground px-3.5 py-2.5 text-sm font-semibold text-background">My Copy Trading</Link></div></div>
    <div className="mt-5 rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm leading-5 text-amber-100"><strong>Live orders.</strong> Copying sends trades to a linked real MT5 account after you confirm. You can pause or stop each provider separately. Real trading can lose money.</div>
    {error && <p role="alert" className="mt-4 rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}

    <section className="mt-7" aria-label="Provider directory"><div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3 sm:flex-row sm:items-center"><label className="min-w-0 flex-1"><span className="sr-only">Search providers</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search provider, market or strategy" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent" /></label><label className="flex items-center gap-2 px-1 text-sm"><input type="checkbox" checked={verifiedOnly} onChange={(event) => setVerifiedOnly(event.target.checked)} className="accent-accent" />Verified history only</label><label className="flex items-center gap-2 text-sm text-muted">Sort<select value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground"><option value="newest">Recently approved</option><option value="followers">Most followed</option><option value="net-pnl">Verified net P&amp;L</option></select></label></div>
      {loading ? <p className="mt-5 text-sm text-muted">Loading providers…</p> : providers.length === 0 ? <div className="mt-5 rounded-xl border border-dashed border-border p-8 text-center"><h2 className="text-base font-semibold">{profiles.length ? "No providers match these filters" : "No approved providers yet"}</h2><p className="mt-2 text-sm text-muted">{profiles.length ? "Try a broader search or clear the verified history filter." : "Provider profiles appear here after Mivo completes its review."}</p></div> : <div className="mt-4 grid gap-4 lg:grid-cols-2">{providers.map((provider) => <article key={provider.id} className="rounded-xl border border-border bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold">{provider.user.name}</h2><span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">Mivo approved</span></div><p className="mt-1 line-clamp-2 text-sm text-muted">{provider.markets}</p></div><span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${provider.performance.verified ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-border text-muted"}`}>{provider.performance.verified ? "Broker history verified" : "Performance unverified"}</span></div>
        <p className="mt-4 line-clamp-2 text-sm leading-5 text-muted">{provider.bio}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{[
          ["Net P&L", provider.performance.verified ? number(provider.performance.netPnl) : "—"],
          ["Max drawdown", provider.performance.verified ? number(provider.performance.maxDrawdown) : "—"],
          ["Win rate", provider.performance.verified ? `${number(provider.performance.winRate, 1)}%` : "—"],
          ["Profit factor", provider.performance.verified ? provider.performance.profitFactorInfinite ? "∞" : number(provider.performance.profitFactor) : "—"],
        ].map(([label, value]) => <div key={label} className="rounded-lg border border-border bg-background/60 px-3 py-2"><p className="text-[10px] font-medium uppercase tracking-wide text-muted">{label}</p><p className="mt-1 text-sm font-semibold tabular-nums">{value}</p></div>)}</div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted"><span>{provider.performance.verified ? `${provider.performance.totalTrades} broker synced closed trades · account units` : "No verified broker synced history"}</span><span>{provider.followerCount} live followers</span></div>
        <div className="mt-3 rounded-lg border border-border bg-background/60 px-3 py-2 text-xs"><span className="text-muted">Agreed split:</span> <strong>Copier {Math.round(provider.copierProfitShareRate * 100)}% · Mivo 10% · Provider {90 - Math.round(provider.copierProfitShareRate * 100)}%</strong> <span className="text-muted">of eligible profit</span></div>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3"><span className="text-xs text-muted">Shared journal trades: {provider.user.journalTrades.length}</span><Link href={`/copy-trading/${provider.id}`} className="rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-accent-foreground">View provider</Link></div>
      </article>)}</div>}
    </section>
    <p className="mt-6 max-w-4xl text-xs leading-5 text-muted">Verified figures are calculated from MT5 synced closed history while the provider connection is active. Net P&amp;L and drawdown are in the broker account’s units because its currency is not currently stored. Win rate and profit factor use all synced closed trades; no return percentage or risk grade is inferred without a reliable baseline or defined methodology. Shared journal entries are self-reported.</p>
  </div></main>;
}
