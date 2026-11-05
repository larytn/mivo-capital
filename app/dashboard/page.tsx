"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Trade = {
  id: string;
  symbol: string;
  direction: string;
  status: string;
  pnl: number | string;
  fees: number | string;
  openedAt: string;
  closedAt: string | null;
};

type CommunityPost = {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: string;
  author: { name: string };
  likes?: Array<unknown>;
  comments?: Array<unknown>;
  likesCount?: number;
  commentsCount?: number;
};

type Range = "1W" | "1M" | "3M" | "ALL";

const ranges: { label: Range; duration: number | null }[] = [
  { label: "1W", duration: 7 * 24 * 60 * 60 * 1000 },
  { label: "1M", duration: 30 * 24 * 60 * 60 * 1000 },
  { label: "3M", duration: 90 * 24 * 60 * 60 * 1000 },
  { label: "ALL", duration: null },
];

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);

const netResult = (trade: Trade) =>
  Number(trade.pnl || 0) - Number(trade.fees || 0);

function shortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function timeAgo(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return minutes + "m ago";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + "h ago";
  const days = Math.floor(hours / 24);
  if (days < 7) return days + "d ago";
  return shortDate(value);
}

function EquityChart({ trades }: { trades: Trade[] }) {
  const points = useMemo(() => {
    const ordered = [...trades].sort(
      (a, b) =>
        new Date(a.closedAt || a.openedAt).getTime() -
        new Date(b.closedAt || b.openedAt).getTime(),
    );
    return ordered.reduce(
      (curve, trade) => {
        const previous = curve[curve.length - 1].value;
        return curve.concat({
          date: trade.closedAt || trade.openedAt,
          value: previous + netResult(trade),
        });
      },
      [{ date: "", value: 0 }],
    );
  }, [trades]);

  if (trades.length === 0) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center px-5 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 text-xl text-accent">
          ↗
        </span>
        <h3 className="mt-4 text-lg font-semibold">Your trading record starts here</h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted">
          Log your first trade or replay a setup. Your own results will build this performance view.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link
            href="/journal"
            className="rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground transition hover:bg-accent/90"
          >
            Log a trade
          </Link>
          <Link
            href="/backtesting"
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition hover:bg-surface-raised"
          >
            Start a backtest
          </Link>
        </div>
      </div>
    );
  }

  const width = 760;
  const height = 232;
  const inset = 18;
  const values = points.map((point) => point.value);
  const minimum = Math.min(0, ...values);
  const maximum = Math.max(0, ...values);
  const valueRange = maximum - minimum || 1;
  const plotPoints = points.map((point, index) => {
    const x =
      inset +
      (index / Math.max(points.length - 1, 1)) * (width - inset * 2);
    const y =
      height -
      inset -
      ((point.value - minimum) / valueRange) * (height - inset * 2);
    return { x, y, value: point.value };
  });
  const linePath = plotPoints
    .map((point, index) => (index === 0 ? "M" : "L") + point.x + " " + point.y)
    .join(" ");
  const fillPath =
    linePath +
    " L " +
    plotPoints[plotPoints.length - 1].x +
    " " +
    (height - inset) +
    " L " +
    inset +
    " " +
    (height - inset) +
    " Z";
  const zeroY = height - inset - ((0 - minimum) / valueRange) * (height - inset * 2);
  const finalValue = values[values.length - 1];
  const lineColor = finalValue >= 0 ? "#34d399" : "#fb7185";

  return (
    <div className="px-4 pb-4 pt-2 sm:px-6">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{shortDate(points[1].date)}</span>
        <span>{shortDate(points[points.length - 1].date)}</span>
      </div>
      <svg
        className="mt-2 h-52 w-full overflow-visible"
        viewBox={"0 0 " + width + " " + height}
        preserveAspectRatio="none"
        role="img"
        aria-label="Cumulative net trading performance from journaled trades"
      >
        <defs>
          <linearGradient id="equity-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.22" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line
          x1={inset}
          x2={width - inset}
          y1={zeroY}
          y2={zeroY}
          stroke="currentColor"
          strokeOpacity="0.13"
          strokeDasharray="4 6"
        />
        <path d={fillPath} fill="url(#equity-fill)" />
        <path
          d={linePath}
          fill="none"
          stroke={lineColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {plotPoints.length > 1 && (
          <circle
            cx={plotPoints[plotPoints.length - 1].x}
            cy={plotPoints[plotPoints.length - 1].y}
            r="5"
            fill={lineColor}
            stroke="var(--background)"
            strokeWidth="3"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
    </div>
  );
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [trades, setTrades] = useState<Trade[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [dataWarnings, setDataWarnings] = useState<string[]>([]);
  const [range, setRange] = useState<Range>("ALL");
  const [referenceTime, setReferenceTime] = useState<number | null>(null);

  useEffect(() => {
    let active = true;


    async function loadDashboard() {
      try {
        const response = await fetch("/api/dashboard", { cache: "no-store" });
        const data = await response.json().catch(() => null);

        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!active) return;
        if (!response.ok) return;

        setDataWarnings(Array.isArray(data?.errors)
          ? data.errors.filter((item: unknown): item is string => typeof item === "string")
          : []);
        const name = data?.profile?.name;
        if (typeof name === "string") setUserName(name.trim());
        setTrades(Array.isArray(data?.trades) ? data.trades : []);
        setPosts(Array.isArray(data?.posts) ? data.posts : []);
      } catch {
        // Keep transient activity failures from adding a warning to the overview.
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadDashboard();
    return () => {
      active = false;
    };
  }, []);

  const closedTrades = useMemo(
    () =>
      trades
        .filter((trade) => trade.status === "CLOSED")
        .sort(
          (a, b) =>
            new Date(a.closedAt || a.openedAt).getTime() -
            new Date(b.closedAt || b.openedAt).getTime(),
        ),
    [trades],
  );

  const selectedTrades = useMemo(() => {
    const duration = ranges.find((item) => item.label === range)?.duration;
    if (duration === null || duration === undefined || referenceTime === null) {
      return closedTrades;
    }
    const cutoff = referenceTime - duration;
    return closedTrades.filter(
      (trade) =>
        new Date(trade.closedAt || trade.openedAt).getTime() >= cutoff,
    );
  }, [closedTrades, range, referenceTime]);

  const stats = useMemo(() => {
    const results = selectedTrades.map(netResult);
    const gains = results.reduce((sum, value) => sum + Math.max(value, 0), 0);
    const losses = results.reduce((sum, value) => sum + Math.abs(Math.min(value, 0)), 0);
    const wins = results.filter((value) => value > 0).length;
    const net = results.reduce((sum, value) => sum + value, 0);
    return {
      net,
      trades: results.length,
      wins,
      losses: results.length - wins,
      winRate: results.length ? (wins / results.length) * 100 : null,
      profitFactor:
        results.length === 0
          ? null
          : losses === 0
            ? gains > 0
              ? Infinity
              : 0
            : gains / losses,
    };
  }, [selectedTrades]);

  const recentTrades = useMemo(
    () =>
      [...trades]
        .sort(
          (a, b) =>
            new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime(),
        )
        .slice(0, 5),
    [trades],
  );

  if (loading) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-5 text-sm text-muted">
        Preparing your trading desk…
      </main>
    );
  }

  const noClosedTrades = closedTrades.length === 0;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[1480px] px-5 pb-14 pt-8 sm:px-8 sm:pt-10">
        <section className="relative overflow-hidden rounded-[28px] border border-accent/20 bg-[radial-gradient(ellipse_at_82%_0%,rgba(83,223,201,0.18),transparent_40%),radial-gradient(ellipse_at_8%_100%,rgba(255,189,105,0.08),transparent_45%),linear-gradient(135deg,var(--surface),var(--background))] px-6 py-7 sm:px-9 sm:py-9">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border border-accent/10" />
          <div className="pointer-events-none absolute -right-4 -top-8 h-44 w-44 rounded-full border border-accent/10" />
          <div className="relative flex flex-col justify-between gap-8 xl:flex-row xl:items-end">
            <div className="max-w-3xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-accent">
                Mivo Capital <span className="mx-2 text-muted">/</span> Trading desk
              </p>
              <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight sm:text-5xl">
                {userName
                  ? "Welcome back, " + userName + "."
                  : "Build your edge, one session at a time."}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
                Review your decisions, test your setups, and exchange ideas with other traders.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/backtesting"
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-accent-foreground transition hover:bg-accent/90"
                >
                  Test a strategy <span aria-hidden="true">↗</span>
                </Link>
                <Link
                  href="/journal"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/40 px-5 py-3 text-sm font-semibold transition hover:bg-surface-raised"
                >
                  Open your journal <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
            <div className="hidden min-w-52 border-l border-accent/15 pl-6 xl:block">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                The Mivo method
              </p>
              <p className="mt-3 text-sm font-semibold">Learn <span className="text-accent">→</span> Test</p>
              <p className="mt-1 text-sm font-semibold">Record <span className="text-accent">→</span> Improve</p>
            </div>
          </div>
        </section>

        {dataWarnings.length > 0 && (
          <div role="status" className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            <p className="font-semibold">Some dashboard data could not be loaded.</p>
            <ul className="mt-1 list-inside list-disc text-amber-100/80">
              {dataWarnings.map((warning, index) => <li key={index}>{warning}</li>)}
            </ul>
          </div>
        )}

        <section
          aria-label="Trading performance summary"
          className="mt-6 grid grid-cols-2 border-y border-border sm:grid-cols-4"
        >
          <div className="border-b border-r border-border px-4 py-5 sm:border-b-0 sm:px-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Net P&amp;L</p>
            <p className={"mt-2 text-2xl font-bold tracking-tight " + (noClosedTrades ? "text-muted" : stats.net >= 0 ? "text-accent" : "text-rose-400")}>
              {noClosedTrades ? "—" : money(stats.net)}
            </p>
            <p className="mt-1 text-xs text-muted">{range === "ALL" ? "All recorded" : "Selected period"}</p>
          </div>
          <div className="border-b border-border px-4 py-5 sm:border-b-0 sm:border-r sm:px-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Win rate</p>
            <p className="mt-2 text-2xl font-bold tracking-tight">
              {stats.winRate === null ? "—" : stats.winRate.toFixed(1) + "%"}
            </p>
            <p className="mt-1 text-xs text-muted">
              {stats.trades ? stats.wins + " wins · " + stats.losses + " losses" : "No closed trades yet"}
            </p>
          </div>
          <div className="border-r border-border px-4 py-5 sm:px-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Closed trades</p>
            <p className="mt-2 text-2xl font-bold tracking-tight">{stats.trades || "—"}</p>
            <p className="mt-1 text-xs text-muted">In your journal</p>
          </div>
          <div className="px-4 py-5 sm:px-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Profit factor</p>
            <p className="mt-2 text-2xl font-bold tracking-tight">
              {stats.profitFactor === null
                ? "—"
                : stats.profitFactor === Infinity
                  ? "∞"
                  : stats.profitFactor.toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-muted">Net results, selected period</p>
          </div>
        </section>

        <section className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(330px,0.85fr)]">
          <article className="overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="flex flex-col justify-between gap-4 border-b border-border px-5 py-5 sm:flex-row sm:items-center sm:px-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">Performance</p>
                <h2 className="mt-1 text-xl font-bold">Cumulative net results</h2>
              </div>
              <div className="flex items-center gap-1 rounded-xl border border-border bg-background p-1" aria-label="Performance date range">
                {ranges.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    aria-pressed={range === item.label}
                    onClick={() => { setRange(item.label); setReferenceTime(Date.now()); }}
                    className={
                      "rounded-lg px-3 py-1.5 text-xs font-semibold transition " +
                      (range === item.label
                        ? "bg-accent text-accent-foreground"
                        : "text-muted hover:text-foreground")
                    }
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-end justify-between gap-4 px-5 pt-5 sm:px-6">
              <div>
                <p className="text-3xl font-bold tracking-tight">
                  {selectedTrades.length ? money(stats.net) : "—"}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {selectedTrades.length
                    ? selectedTrades.length + " closed " + (selectedTrades.length === 1 ? "trade" : "trades") + " · fees included"
                    : noClosedTrades
                      ? "Waiting for your first journaled result"
                      : "No closed trades in this range"}
                </p>
              </div>
              <Link href="/journal" className="text-sm font-semibold text-accent hover:text-accent">
                Review journal →
              </Link>
            </div>
            <EquityChart trades={selectedTrades} />
          </article>

          <article className="overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-5 sm:px-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">Your journal</p>
                <h2 className="mt-1 text-xl font-bold">Recent trades</h2>
              </div>
              <Link href="/journal" className="text-xs font-semibold text-accent hover:text-accent">
                View all →
              </Link>
            </div>
            <div className="divide-y divide-border">
              {recentTrades.map((trade) => {
                const result = netResult(trade);
                const isClosed = trade.status === "CLOSED";
                return (
                  <div key={trade.id} className="flex items-center justify-between gap-3 px-5 py-4 sm:px-6">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold">{trade.symbol}</span>
                        <span className="rounded-md border border-border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted">
                          {trade.direction}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted">{shortDate(trade.openedAt)} · {trade.status}</p>
                    </div>
                    <span className={"shrink-0 text-sm font-semibold " + (!isClosed ? "text-muted" : result >= 0 ? "text-accent" : "text-rose-400")}>
                      {isClosed ? money(result) : "Open"}
                    </span>
                  </div>
                );
              })}
              {recentTrades.length === 0 && (
                <div className="px-6 py-9">
                  <p className="font-semibold">No trades in the journal yet</p>
                  <p className="mt-2 text-sm leading-6 text-muted">Record a live trade or save a finished replay to start reviewing your decisions here.</p>
                  <Link href="/journal" className="mt-4 inline-flex text-sm font-semibold text-accent hover:text-accent">
                    Add your first trade →
                  </Link>
                </div>
              )}
            </div>
            <div className="border-t border-border px-5 py-4 sm:px-6">
              <Link href="/backtesting" className="flex items-center justify-between gap-3 text-sm font-semibold transition hover:text-accent">
                <span>Replay a setup in the Backtesting Lab</span>
                <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </article>
        </section>

        <section className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <article className="overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-5 sm:px-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">Learn together</p>
                <h2 className="mt-1 text-xl font-bold">From the community</h2>
              </div>
              <Link href="/community" className="text-xs font-semibold text-accent hover:text-accent">
                Join the conversation →
              </Link>
            </div>
            <div className="divide-y divide-border">
              {posts.slice(0, 3).map((post) => (
                <Link
                  key={post.id}
                  href="/community"
                  className="block px-5 py-4 transition hover:bg-background/50 sm:px-6"
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
                    <span className="font-semibold text-accent">{post.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{post.author?.name || "Mivo member"}</span>
                    <span aria-hidden="true">·</span>
                    <span>{timeAgo(post.createdAt)}</span>
                  </div>
                  <h3 className="mt-2 font-semibold">{post.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">{post.content}</p>
                  <p className="mt-2 text-[11px] text-muted">
                    {(post.likesCount ?? post.likes?.length ?? 0) + " reactions · " + (post.commentsCount ?? post.comments?.length ?? 0) + " comments"}
                  </p>
                </Link>
              ))}
              {posts.length === 0 && (
                <div className="px-6 py-8">
                  <p className="font-semibold">Your community is getting ready</p>
                  <p className="mt-2 text-sm leading-6 text-muted">Share a setup, ask a question, or join the conversation with other Mivo traders.</p>
                  <Link href="/community" className="mt-4 inline-flex text-sm font-semibold text-accent hover:text-accent">
                    Open the community →
                  </Link>
                </div>
              )}
            </div>
          </article>

          <article className="overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-5 sm:px-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">Trader chat</p>
                <h2 className="mt-1 text-xl font-bold">Join the conversation</h2>
              </div>
              <Link href="/chat" className="text-xs font-semibold text-accent hover:text-accent">
                Open chat →
              </Link>
            </div>
            <div className="p-5 sm:p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-accent/20 bg-accent/10 text-lg text-accent">
                T
              </div>
              <h3 className="mt-4 text-lg font-semibold">One room for Mivo traders</h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                Share market context and discuss setups in the shared trader chat.
              </p>
              <Link href="/chat" className="mt-4 inline-flex text-sm font-semibold text-accent hover:text-accent">
                Enter trader chat →
              </Link>
            </div>
          </article>
        </section>

        <footer className="mt-8 flex flex-col gap-2 border-t border-border pt-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Mivo Capital</p>
          <p>Learn. Test. Record. Improve.</p>
        </footer>
      </div>
    </main>
  );
}
