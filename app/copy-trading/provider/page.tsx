"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";

type Performance = { verified: boolean; sourceLabel: string; netPnl: number | null; maxDrawdown: number | null; winRate: number | null; profitFactor: number | null; profitFactorInfinite: boolean; totalTrades: number | null; lastSyncedAt: string | null };
type Profile = { id: string; bio: string; strategy: string; markets: string; evidenceUrl: string | null; status: string; reviewFeedback: string | null; performance: Performance; followerCount: number; copierProfitShareRate: number; profitSplitVersion: number; providerAccountLinked: boolean; copyFactoryStrategyId: string | null; copyFactoryStatus: string; brokerReferralConfirmedAt: string | null; brokerReferralUrl: string | null; ibVerifiedAt: string | null };
type JournalTrade = { id: string; symbol: string; direction: string; status: string; entryPrice: number; exitPrice: number | null; currentPrice: number | null; pnl: number; fees: number; source: string; openedAt: string; isPublic: boolean };
type Data = { myProfile?: Profile | null; liveCopyEnabled?: boolean; brokerReferral?: { brokerName: string | null; signupUrl: string | null }; error?: string };
const field = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent";
const amount = (value: number | null, digits = 2) => value == null ? "—" : new Intl.NumberFormat("en", { maximumFractionDigits: digits }).format(value);

export default function ProviderPortalPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [trades, setTrades] = useState<JournalTrade[]>([]);
  const [brokerReferral, setBrokerReferral] = useState<{ brokerName: string | null; signupUrl: string | null }>({ brokerName: null, signupUrl: null });
  const [form, setForm] = useState({ bio: "", strategy: "", markets: "", evidenceUrl: "", copierProfitShareRate: "0.3" });
  const [consent, setConsent] = useState(false);
  const [brokerReferralConfirmed, setBrokerReferralConfirmed] = useState(false);
  const [activationConsent, setActivationConsent] = useState(false);
  const [liveCopyEnabled, setLiveCopyEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const [profileResponse, journalResponse] = await Promise.all([fetch("/api/copy-trading", { cache: "no-store" }), fetch("/api/journal", { cache: "no-store" })]);
      if (profileResponse.status === 401 || journalResponse.status === 401) { window.location.href = "/login"; return; }
      const data = await profileResponse.json() as Data;
      const journal = await journalResponse.json() as { trades?: JournalTrade[]; error?: string };
      if (!profileResponse.ok) throw new Error(data.error || "Unable to load provider details.");
      if (!journalResponse.ok) throw new Error(journal.error || "Unable to load your trading history.");
      setProfile(data.myProfile ?? null); setTrades(Array.isArray(journal.trades) ? journal.trades : []); setLiveCopyEnabled(data.liveCopyEnabled === true); setBrokerReferral(data.brokerReferral ?? { brokerName: null, signupUrl: null });
      setBrokerReferralConfirmed(Boolean(data.myProfile?.brokerReferralConfirmedAt && data.myProfile.brokerReferralUrl && data.myProfile.brokerReferralUrl === data.brokerReferral?.signupUrl));
      if (data.myProfile) setForm({ bio: data.myProfile.bio, strategy: data.myProfile.strategy, markets: data.myProfile.markets, evidenceUrl: data.myProfile.evidenceUrl ?? "", copierProfitShareRate: String(data.myProfile.copierProfitShareRate) });
      setError("");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load provider details."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/copy-trading", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "apply", ...form, copierProfitShareRate: Number(form.copierProfitShareRate), consent, brokerReferralConfirmed }) });
      const data = await response.json() as { profile?: Partial<Profile>; message?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to submit application.");
      setNotice(data.message || "Application submitted for review."); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to submit application."); }
    finally { setBusy(false); }
  }

  async function activateLiveProvider() {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/copy-trading/provider/activate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ consent: activationConsent }) });
      const data = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to activate live copying.");
      setNotice(data.message || "Live provider connection activated."); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to activate live copying."); }
    finally { setBusy(false); }
  }

  async function togglePublic(trade: JournalTrade) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/journal", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: trade.id, isPublic: !trade.isPublic }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to update trade visibility.");
      setTrades((current) => current.map((item) => item.id === trade.id ? { ...item, isPublic: !trade.isPublic } : item));
      setNotice(`Trade visibility changed to ${!trade.isPublic ? "shared" : "private"}.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to update trade visibility."); }
    finally { setBusy(false); }
  }

  const verified = profile?.performance.verified;
  return <main className="min-h-screen px-4 py-7 text-foreground sm:px-7 sm:py-9"><div className="mx-auto max-w-5xl">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Copy trading · Provider</p><h1 className="mt-2 text-2xl font-bold sm:text-3xl">Strategy Provider Portal</h1><p className="mt-2 text-sm text-muted">Manage your application, public trading history and provider performance.</p></div><Link href="/copy-trading" className="rounded-lg border border-border px-3.5 py-2.5 text-sm font-semibold">Copy Trading</Link></div>
    {error && <p role="alert" className="mt-4 rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}{notice && <p role="status" className="mt-4 rounded-lg border border-border bg-surface p-3 text-sm">{notice}</p>}
    {loading ? <p className="mt-6 text-sm text-muted">Loading your provider workspace…</p> : <>
      {profile && <><section className="mt-6 rounded-xl border border-border bg-surface p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-muted">Application status</p><h2 className="mt-1 text-lg font-semibold">{profile.status.replaceAll("_", " ")}</h2></div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-xs ${profile.status === "APPROVED" ? "border-emerald-400/30 text-emerald-300" : "border-border text-muted"}`}>{profile.status === "APPROVED" ? "Provider approved" : "Mivo review required"}</span>{profile.status === "APPROVED" && profile.profitSplitVersion === 2 && <Link href={`/copy-trading/${profile.id}`} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold">Open public profile</Link>}</div></div>{profile.reviewFeedback && <p className="mt-4 rounded-lg border border-amber-400/25 bg-amber-400/10 p-3 text-sm leading-5">Review feedback: {profile.reviewFeedback}</p>}</section>
        <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">{[
          ["Verified net P&L", verified ? amount(profile.performance.netPnl) : "—"],
          ["Maximum drawdown", verified ? amount(profile.performance.maxDrawdown) : "—"],
          ["Closed trades", verified ? String(profile.performance.totalTrades) : "—"],
          ["Win rate", verified ? `${amount(profile.performance.winRate, 1)}%` : "—"],
          ["Profit factor", verified ? profile.performance.profitFactorInfinite ? "∞" : amount(profile.performance.profitFactor) : "—"],
        ].map(([label, value]) => <div key={label} className="rounded-xl border border-border bg-surface p-3"><p className="text-[10px] font-medium uppercase tracking-wide text-muted">{label}</p><p className="mt-1 text-lg font-semibold tabular-nums">{value}</p></div>)}</section>
        <section className="mt-3 rounded-xl border border-border bg-surface p-4"><div className="flex flex-wrap gap-x-8 gap-y-2 text-sm"><p><span className="text-muted">Live followers:</span> <strong>{profile.followerCount}</strong></p><p><span className="text-muted">Provider account:</span> <strong>{profile.providerAccountLinked ? "Connected" : "Not connected"}</strong></p><p><span className="text-muted">Mivo IB verification:</span> <strong>{profile.ibVerifiedAt ? "Verified" : "Pending"}</strong></p><p><span className="text-muted">CopyFactory:</span> <strong>{profile.copyFactoryStatus.replaceAll("_", " ")}</strong></p><p><span className="text-muted">Copier’s agreed share:</span> <strong>{Math.round(profile.copierProfitShareRate * 100)}%</strong></p></div><p className="mt-2 text-xs leading-5 text-muted">Mivo receives 10% of eligible profit. Your provider share is the remainder after your copier offer and Mivo’s share.</p></section>
        {profile.profitSplitVersion !== 2 && <p className="mt-3 rounded-lg border border-amber-300/25 bg-amber-300/5 p-3 text-sm text-amber-100">Your profile uses previous profit split terms. Submit the updated offer below and complete Mivo’s review before it can appear in Copy Trading or be activated.</p>}
        {profile.status === "APPROVED" && profile.profitSplitVersion === 2 && profile.copyFactoryStatus !== "ACTIVE" && <section className="mt-4 rounded-xl border border-accent/25 bg-accent/5 p-4"><h3 className="font-semibold">Connect your live provider strategy</h3><p className="mt-1 text-sm leading-5 text-muted">This connects your approved real MT5 account to CopyFactory so followers can receive live trades. The provider source remains read-only. Enabling CopyFactory may incur MetaApi service charges to Mivo.</p><label className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted"><input type="checkbox" checked={activationConsent} onChange={(event) => setActivationConsent(event.target.checked)} className="mt-1 accent-accent" /><span>I authorize Mivo to enable CopyFactory for my approved provider account and publish its trades to followers who separately authorize copying.</span></label><button type="button" onClick={() => void activateLiveProvider()} disabled={busy || !activationConsent || !liveCopyEnabled} className="mt-3 rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-50">{!liveCopyEnabled ? "Live service not enabled" : busy ? "Connecting…" : "Enable live provider strategy"}</button></section>}
      </>}

      <section className="mt-6 rounded-xl border border-border bg-surface p-4 sm:p-5"><h2 className="text-base font-semibold">{profile ? "Provider application and profile" : "Apply to become a provider"}</h2><p className="mt-1 text-sm leading-5 text-muted">Mivo administrators review experience, strategy, risk controls, history and evidence before approving a profile.</p>
        <div className="mt-4 rounded-lg border border-accent/25 bg-accent/5 p-3"><h3 className="text-sm font-semibold">Open your provider account through Mivo</h3><p className="mt-1 text-xs leading-5 text-muted">Register a new broker account using Mivo’s link, then connect that same real MT5 account below. Mivo will check the account in its broker IB records before approving your provider profile.</p>{brokerReferral.signupUrl ? <a href={brokerReferral.signupUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex rounded-lg bg-foreground px-3.5 py-2 text-xs font-semibold text-background">{brokerReferral.brokerName ? `Register with ${brokerReferral.brokerName}` : "Register through Mivo’s broker link"}</a> : <p role="status" className="mt-3 rounded-md border border-amber-400/25 bg-amber-400/5 p-2.5 text-xs text-amber-100">Mivo’s broker referral link is not configured yet. Provider applications will open when Mivo adds its broker signup link.</p>}</div>
        {!profile?.providerAccountLinked && <div className="mt-4 rounded-lg border border-amber-300/25 bg-amber-300/5 p-3 text-sm text-amber-100">A real MT5 provider account connected with the investor/read-only password is required. <Link href="/automation" className="font-semibold underline">Connect MT5 in Journal Sync</Link>.</div>}
        <form onSubmit={apply} className="mt-4 grid gap-3 md:grid-cols-2"><label className="text-sm font-medium">Markets<input className={`${field} mt-1.5`} required maxLength={160} value={form.markets} onChange={(event) => setForm({ ...form, markets: event.target.value })} placeholder="FX, gold, indices" /></label><label className="text-sm font-medium">Supporting evidence link (HTTPS)<input className={`${field} mt-1.5`} type="url" value={form.evidenceUrl} onChange={(event) => setForm({ ...form, evidenceUrl: event.target.value })} placeholder="Broker statement or relevant evidence" /></label><label className="text-sm font-medium md:row-span-2">Strategy and risk approach<textarea className={`${field} mt-1.5 min-h-32`} required minLength={20} maxLength={1200} value={form.strategy} onChange={(event) => setForm({ ...form, strategy: event.target.value })} placeholder="Process, timeframe, instruments, risk and position management" /></label><label className="text-sm font-medium">Provider biography<textarea className={`${field} mt-1.5 min-h-32`} required minLength={30} maxLength={1200} value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} placeholder="Experience and background" /></label><label className="text-sm font-medium">Share the copier receives<select className={`${field} mt-1.5`} value={form.copierProfitShareRate} onChange={(event) => setForm({ ...form, copierProfitShareRate: event.target.value })}>{Array.from({ length: 19 }, (_, index) => index * 5).map((percent) => <option key={percent} value={percent / 100}>{percent}% of eligible profit</option>)}</select></label><p className="rounded-lg border border-border bg-background p-3 text-xs leading-5 text-muted">You choose the copier’s share before anyone starts. On $100 of eligible profit, a 30% copier offer means the copier receives $30, Mivo receives $10, and you receive $60. Your offer uses monthly high-water-mark accounting.</p><label className="flex items-start gap-2.5 text-xs leading-5 text-muted md:col-span-2"><input type="checkbox" checked={brokerReferralConfirmed} onChange={(event) => setBrokerReferralConfirmed(event.target.checked)} className="mt-1 accent-accent" disabled={!brokerReferral.signupUrl} /><span>I confirm that I registered this provider trading account through Mivo’s broker link and that it is the same real MT5 account connected in Journal Sync. I understand Mivo must verify its IB registration before approval.</span></label><label className="flex items-start gap-2.5 text-xs leading-5 text-muted md:col-span-2"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 accent-accent" /><span>I agree that Mivo may calculate aggregate performance from all my MT5 synced closed history while connected, including trades I do not individually share. I understand that only trades I mark shared appear in the public trade list. My provider source connects with read-only access; followers must separately link trade-enabled real accounts and consent before any live order is copied.</span></label><button type="submit" disabled={busy || !consent || !brokerReferral.signupUrl || !brokerReferralConfirmed} className="w-fit rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-50">{busy ? "Submitting…" : profile ? "Save and resubmit for review" : "Submit provider application"}</button></form>
      </section>

      <section className="mt-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-base font-semibold">Your trading history</h2><p className="mt-1 text-sm text-muted">Choose which journal trade details you share with Copy Trading members.</p></div><Link href="/journal" className="text-sm font-semibold text-accent">Manage journal →</Link></div>
        {trades.length === 0 ? <p className="mt-3 rounded-xl border border-dashed border-border p-5 text-sm text-muted">No journal history yet. Add trades in your journal; verified performance requires MT5 synced history.</p> : <div className="mt-3 overflow-hidden rounded-xl border border-border bg-surface"><div className="hidden grid-cols-[1.2fr_1fr_1fr_1fr_auto] gap-3 border-b border-border px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted sm:grid"><span>Instrument</span><span>Direction</span><span>Status</span><span>Entry</span><span>Sharing</span></div>{trades.slice(0, 30).map((trade) => <div key={trade.id} className="grid gap-2 border-b border-border px-4 py-3 last:border-0 sm:grid-cols-[1.2fr_1fr_1fr_1fr_auto] sm:items-center sm:gap-3"><span className="text-sm font-semibold">{trade.symbol}</span><span className="text-xs text-muted">{trade.direction}</span><span className="text-xs text-muted">{trade.status} · {trade.source === "MT5" ? "MT5 synced" : "Journal"}</span><span className="text-xs tabular-nums text-muted">{amount(trade.entryPrice, 5)}</span><button type="button" disabled={busy} onClick={() => void togglePublic(trade)} className={`w-fit rounded-md border px-2.5 py-1.5 text-xs font-semibold ${trade.isPublic ? "border-emerald-400/30 text-emerald-300" : "border-border text-muted"}`}>{trade.isPublic ? "Shared · make private" : "Private · share"}</button></div>)}</div>}
      </section>
    </>}</div></main>;
}
