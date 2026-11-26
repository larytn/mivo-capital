import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Legal notices",
  description: "Open-source software attribution notices used by Mivo Capital.",
};

export default function ThirdPartyNoticesPage() {
  return (
    <main className="min-h-[calc(100svh-64px)] bg-background px-4 py-8 text-foreground sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-accent">Mivo Capital</p>
        <h1 className="mt-2 text-2xl font-bold">Legal notices</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">Attribution for third-party software used in the Mivo Capital application.</p>

        <section className="mt-6 rounded-xl border border-border bg-surface p-5">
          <h2 className="font-semibold">TradingView Lightweight Charts™</h2>
          <p className="mt-2 text-sm text-muted">Copyright (с) 2025 TradingView, Inc.</p>
          <a
            className="mt-2 inline-flex text-sm text-accent underline underline-offset-4"
            href="https://www.tradingview.com/"
            target="_blank"
            rel="noreferrer"
          >
            https://www.tradingview.com/
          </a>
        </section>
      </div>
    </main>
  );
}
