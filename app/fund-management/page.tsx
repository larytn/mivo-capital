import Link from "next/link";

const steps = [
  ["01", "Apply and verify", "Complete identity, suitability, experience and risk-capacity review. Mivo records the outcome before any mandate is proposed."],
  ["02", "Review the mandate", "If accepted for the demo workflow, review the Mivo-appointed manager, risk limits, profit split and settlement frequency before acknowledging the terms."],
  ["03", "Report from records", "Account figures and performance are shown only when supported by verified account statements and approved expenses."],
];

export default function FundManagementPage() {
  return <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-7 sm:py-10"><div className="mx-auto max-w-6xl">
    <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Mivo Capital · Capital services</p>
    <div className="mt-4 grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-end"><div><h1 className="max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">Fund Management</h1><p className="mt-4 max-w-3xl text-base leading-7 text-muted">A separate service for eligible investors who prefer an approved Mivo-appointed manager to operate within an agreed investment mandate, permissions and risk limits.</p><p className="mt-3 max-w-3xl text-sm leading-6 text-muted">Fund Management is distinct from Copy Trading and VIP Signals. Investors apply for a managed mandate; they do not follow public trade signals or automatically copy another member’s account. Managers are appointed by Mivo; traders do not apply for Fund Management roles.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/fund-management/investor" className="rounded-xl bg-accent px-5 py-3 text-sm font-bold text-accent-foreground">Investor portal</Link></div></div>
      <aside className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-5"><p className="text-xs font-bold uppercase tracking-wider text-amber-200">Development environment · DEMO</p><p className="mt-2 text-sm leading-6 text-amber-100">Applications and internal reviews are available for development. Real deposits, custody, discretionary live trading and payouts are disabled. No investor money is held by Mivo through this portal.</p></aside>
    </div>
    <section className="mt-10 grid gap-4 md:grid-cols-3">{[
      ["Management approach", "Mivo appoints the manager and records each mandate, permissions and investor-approved risk limits. Live manager access is not enabled."],
      ["Profit sharing", "Any future fee would use verified net realised profits, approved expenses, a high-water mark and loss carry-forward. Unrealised gains are excluded."],
      ["Risk and eligibility", "Investing can result in loss, including substantial loss. Eligibility, identity checks, suitability, risk disclosures and signed agreements are required before a live service could be considered."],
    ].map(([title, body]) => <article key={title} className="rounded-2xl border border-border bg-surface p-5"><h2 className="font-bold">{title}</h2><p className="mt-2 text-sm leading-6 text-muted">{body}</p></article>)}</section>
    <section className="mt-10"><h2 className="text-xl font-bold">Application process</h2><div className="mt-4 grid gap-4 md:grid-cols-3">{steps.map(([number, title, body]) => <article key={number} className="rounded-2xl border border-border p-5"><span className="text-xs font-bold text-accent">{number}</span><h3 className="mt-3 font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted">{body}</p></article>)}</div></section>
    <section className="mt-10 rounded-2xl border border-border bg-surface p-5 sm:p-7"><h2 className="text-xl font-bold">Fees and settlement design</h2><p className="mt-3 max-w-4xl text-sm leading-6 text-muted">The proposed mandate records the investor/Mivo profit split and a weekly, biweekly or monthly settlement schedule. The split is configurable and must total 100%. Fees are calculated only from verified net realised profit after approved expenses, while prior losses remain carried forward. Demo calculations are previews only and cannot trigger payments.</p><p className="mt-3 max-w-4xl text-sm leading-6 text-muted">No fixed return or profit is promised. Actual fee terms, custody, broker access, investor agreements, operating controls and regulatory permissions must be approved before any live service can launch.</p></section>
    <p className="mt-8 text-xs leading-5 text-muted">Risk disclosure: trading and managed investment activity involves significant risk. Account values may fall and investors may lose money. Past performance does not assure future results. The current portal is not an offer to invest or a live investment management service.</p>
  </div></main>;
}
