
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Trade = {
  id: string;
  symbol: string;
  direction: string;
  status: string;
  entryPrice: number;
  exitPrice: number | null;
  currentPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  pnl: number;
  fees: number;
  openedAt: string;
  closedAt: string | null;
  strategy: string | null;
  notes: string | null;
  screenshotUrl: string | null;
  isPublic: boolean;
  source?: string;
};

const inputStyle =
  "w-full rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-foreground";

const money = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount || 0);

const panelStyle = "rounded-2xl border border-border bg-surface";
const mutedText = "text-sm text-muted";
const smallLabel = "text-xs text-muted";

export default function JournalPage() {
  const router = useRouter();

  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filter, setFilter] = useState("ALL");

  const [form, setForm] = useState({
    symbol: "",
    direction: "BUY",
    status: "CLOSED",
    entryPrice: "",
    exitPrice: "",
    currentPrice: "",
    stopLoss: "",
    takeProfit: "",
    pnl: "0",
    fees: "0",
    openedAt: new Date().toISOString().slice(0, 16),
    strategy: "",
    screenshotUrl: "",
    notes: "",
    isPublic: false,
  });

  function updateForm(field: string, value: string | boolean) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  const loadTrades = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/journal", {
        cache: "no-store",
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load trades.");
      }

      setTrades(Array.isArray(data) ? data : data.trades || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load trades."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadTrades(), 0);
    return () => window.clearTimeout(timer);
  }, [loadTrades]);

  async function saveTrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          symbol: form.symbol.trim().toUpperCase(),
          entryPrice: Number(form.entryPrice),
          exitPrice: form.exitPrice ? Number(form.exitPrice) : null,
          currentPrice: form.currentPrice ? Number(form.currentPrice) : null,
          stopLoss: form.stopLoss ? Number(form.stopLoss) : null,
          takeProfit: form.takeProfit ? Number(form.takeProfit) : null,
          pnl: Number(form.pnl || 0),
          fees: Number(form.fees || 0),
          screenshotUrl: form.screenshotUrl.trim() || null,
          strategy: form.strategy.trim() || null,
          notes: form.notes.trim() || null,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to save trade.");
      }

      setSuccess("Trade saved successfully.");

      setForm({
        symbol: "",
        direction: "BUY",
        status: "CLOSED",
        entryPrice: "",
        exitPrice: "",
        currentPrice: "",
        stopLoss: "",
        takeProfit: "",
        pnl: "0",
        fees: "0",
        openedAt: new Date().toISOString().slice(0, 16),
        strategy: "",
        screenshotUrl: "",
        notes: "",
        isPublic: false,
      });

      await loadTrades();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save trade."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteTrade(id: string) {
    if (!window.confirm("Delete this trade permanently?")) return;

    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/journal/" + id, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete trade.");
      }

      setTrades((previous) =>
        previous.filter((trade) => trade.id !== id)
      );

      setSuccess("Trade deleted.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete trade."
      );
    }
  }

  async function updateMarketPrice(event: FormEvent<HTMLFormElement>, trade: Trade) {
    event.preventDefault(); setSaving(true); setError(""); setSuccess("");
    const currentPrice = Number(new FormData(event.currentTarget).get("currentPrice"));
    if (!Number.isFinite(currentPrice) || currentPrice <= 0) { setError("Enter a valid current market price."); setSaving(false); return; }
    try {
      const response = await fetch("/api/journal", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: trade.id, currentPrice }) });
      const data = await response.json();
      if (response.status === 401) { router.push("/login"); return; }
      if (!response.ok) throw new Error(data.error || "Could not update the market price.");
      setTrades((current) => current.map((item) => item.id === trade.id ? { ...item, currentPrice } : item));
      setSuccess("Current market price updated.");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not update the market price."); }
    finally { setSaving(false); }
  }

  async function closeTrade(event: FormEvent<HTMLFormElement>, trade: Trade) {
    event.preventDefault(); setSaving(true); setError(""); setSuccess("");
    const fields = new FormData(event.currentTarget);
    const exitPrice = Number(fields.get("exitPrice")); const pnl = Number(fields.get("pnl"));
    if (!Number.isFinite(exitPrice) || exitPrice <= 0 || !Number.isFinite(pnl)) { setError("Enter a valid exit price and realized profit or loss."); setSaving(false); return; }
    try {
      const response = await fetch("/api/journal", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: trade.id, status: "CLOSED", exitPrice, pnl }) });
      const data = await response.json();
      if (response.status === 401) { router.push("/login"); return; }
      if (!response.ok) throw new Error(data.error || "Could not close this trade.");
      setSuccess("Trade closed and journal updated."); await loadTrades();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not close this trade."); }
    finally { setSaving(false); }
  }

  const closedTrades = trades.filter(
    (trade) => trade.status === "CLOSED"
  );

  const netPnl = closedTrades.reduce(
    (total, trade) =>
      total + Number(trade.pnl || 0) - Number(trade.fees || 0),
    0
  );

  const winners = closedTrades.filter(
    (trade) =>
      Number(trade.pnl || 0) - Number(trade.fees || 0) > 0
  ).length;

  const winRate =
    closedTrades.length > 0
      ? (winners / closedTrades.length) * 100
      : 0;

  const openTrades = trades.filter(
    (trade) => trade.status === "OPEN"
  ).length;

  const filteredTrades = trades.filter((trade) => {
    const result =
      Number(trade.pnl || 0) - Number(trade.fees || 0);

    if (filter === "OPEN") return trade.status === "OPEN";
    if (filter === "WIN")
      return trade.status === "CLOSED" && result > 0;
    if (filter === "LOSS")
      return trade.status === "CLOSED" && result <= 0;

    return true;
  });

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground transition-colors duration-200 sm:px-6 sm:py-8 lg:px-10">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="mb-5 inline-flex items-center gap-2 text-sm text-muted transition hover:text-foreground"
            >
              <span aria-hidden="true">←</span>
              Dashboard
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface-raised text-lg font-bold">
                M
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                  Mivo Capital
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-2xl">
                  Trade Journal
                </h1>
              </div>
            </div>

            <p className="mt-4 max-w-xl text-sm leading-6 text-muted">
              Track your execution. Measure your performance. Learn from
              every trade.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/automation")}
              className="rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium transition hover:bg-surface-raised"
            >
              Connect MT5
            </button>

            <button
              type="button"
              onClick={() => void loadTrades()}
              disabled={loading}
              className="rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium transition hover:bg-surface-raised disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </header>

        {/* Notifications */}
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-border bg-surface p-4 text-sm text-foreground"
          >
            <span className="font-semibold">Error:</span> {error}
            <button
              type="button"
              onClick={() => setError("")}
              className="ml-3 text-muted underline underline-offset-4 hover:text-foreground"
            >
              Dismiss
            </button>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 text-sm text-foreground"
          >
            <span>✓ {success}</span>
            <button
              type="button"
              onClick={() => setSuccess("")}
              className="text-muted hover:text-foreground"
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        )}

        {/* Performance Overview */}
        <section
          aria-label="Trading performance overview"
          className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <div className={`${panelStyle} p-4 sm:p-6`}>
            <div className="flex items-center justify-between gap-3">
              <p className={mutedText}>Net P/L</p>
              <span className="text-xs text-muted">AFTER FEES</span>
            </div>

            <p className="mt-5 break-words text-3xl font-semibold tracking-tight tabular-nums">
              {money(netPnl)}
            </p>

            <p className="mt-3 text-xs text-muted">
              From {closedTrades.length} closed{" "}
              {closedTrades.length === 1 ? "trade" : "trades"}
            </p>
          </div>

          <div className={`${panelStyle} p-5 sm:p-6`}>
            <p className={mutedText}>Closed Trades</p>

            <p className="mt-5 text-3xl font-semibold tracking-tight tabular-nums">
              {closedTrades.length}
            </p>

            <p className="mt-3 text-xs text-muted">
              {openTrades} currently open
            </p>
          </div>

          <div className={`${panelStyle} p-5 sm:p-6`}>
            <p className={mutedText}>Win Rate</p>

            <p className="mt-5 text-3xl font-semibold tracking-tight tabular-nums">
              {winRate.toFixed(1)}%
            </p>

            <p className="mt-3 text-xs text-muted">
              {winners} winning trades out of {closedTrades.length} closed
            </p>
          </div>
        </section>

        {/* Record Trade */}
        <section className={`${panelStyle} mb-10 p-4 sm:p-5`}>
          <div className="mb-7 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Trade Management
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">
                Record a Trade
              </h2>
              <p className="mt-2 text-sm text-muted">
                Document the setup, execution and outcome.
              </p>
            </div>

            <span className="rounded-lg border border-border px-3 py-2 text-xs text-muted">
              New Entry
            </span>
          </div>

          <form onSubmit={saveTrade} className="space-y-7">
            <div>
              <h3 className="mb-4 text-sm font-semibold">
                Trade Details
              </h3>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="block space-y-2">
                  <span className={mutedText}>Symbol</span>
                  <input
                    required
                    className={inputStyle}
                    placeholder="XAUUSD / Volatility 75"
                    value={form.symbol}
                    onChange={(e) =>
                      updateForm("symbol", e.target.value)
                    }
                  />
                </label>

                <label className="block space-y-2">
                  <span className={mutedText}>Direction</span>
                  <select
                    className={inputStyle}
                    value={form.direction}
                    onChange={(e) =>
                      updateForm("direction", e.target.value)
                    }
                  >
                    <option value="BUY">BUY / LONG</option>
                    <option value="SELL">SELL / SHORT</option>
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className={mutedText}>Status</span>
                  <select
                    className={inputStyle}
                    value={form.status}
                    onChange={(e) =>
                      updateForm("status", e.target.value)
                    }
                  >
                    <option value="CLOSED">CLOSED</option>
                    <option value="OPEN">OPEN</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h3 className="mb-4 text-sm font-semibold">
                Entry & Exit
              </h3>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <label className="block space-y-2">
                  <span className={mutedText}>Entry Price</span>
                  <input
                    required
                    type="number"
                    step="any"
                    className={inputStyle}
                    placeholder="0.00"
                    value={form.entryPrice}
                    onChange={(e) =>
                      updateForm("entryPrice", e.target.value)
                    }
                  />
                </label>

                <label className="block space-y-2">
                  <span className={mutedText}>Exit Price</span>
                  <input
                    type="number"
                    step="any"
                    className={inputStyle}
                    placeholder="Optional"
                    value={form.exitPrice}
                    onChange={(e) =>
                      updateForm("exitPrice", e.target.value)
                    }
                  />
                </label>

                {form.status === "OPEN" && (
                  <label className="block space-y-2">
                    <span className={mutedText}>Current Market Price</span>
                    <input
                      type="number"
                      step="any"
                      className={inputStyle}
                      placeholder="Defaults to entry price"
                      value={form.currentPrice}
                      onChange={(e) => updateForm("currentPrice", e.target.value)}
                    />
                  </label>
                )}

                <label className="block space-y-2">
                  <span className={mutedText}>Entry Date & Time</span>
                  <input
                    required
                    type="datetime-local"
                    className={inputStyle}
                    value={form.openedAt}
                    onChange={(e) =>
                      updateForm("openedAt", e.target.value)
                    }
                  />
                </label>

                <label className="block space-y-2">
                  <span className={mutedText}>Stop Loss</span>
                  <input
                    type="number"
                    step="any"
                    className={inputStyle}
                    placeholder="Optional"
                    value={form.stopLoss}
                    onChange={(e) =>
                      updateForm("stopLoss", e.target.value)
                    }
                  />
                </label>

                <label className="block space-y-2">
                  <span className={mutedText}>Take Profit</span>
                  <input
                    type="number"
                    step="any"
                    className={inputStyle}
                    placeholder="Optional"
                    value={form.takeProfit}
                    onChange={(e) =>
                      updateForm("takeProfit", e.target.value)
                    }
                  />
                </label>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h3 className="mb-4 text-sm font-semibold">
                Financial Result
              </h3>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <label className="block space-y-2">
                  <span className={mutedText}>Profit / Loss (USD)</span>
                  <input
                    required
                    type="number"
                    step="any"
                    className={inputStyle}
                    value={form.pnl}
                    onChange={(e) =>
                      updateForm("pnl", e.target.value)
                    }
                  />
                </label>

                <label className="block space-y-2">
                  <span className={mutedText}>Fees (USD)</span>
                  <input
                    type="number"
                    step="any"
                    className={inputStyle}
                    value={form.fees}
                    onChange={(e) =>
                      updateForm("fees", e.target.value)
                    }
                  />
                </label>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h3 className="mb-4 text-sm font-semibold">
                Strategy & Documentation
              </h3>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className={mutedText}>Strategy</span>
                  <input
                    className={inputStyle}
                    placeholder="AMS / Liquidity sweep"
                    value={form.strategy}
                    onChange={(e) =>
                      updateForm("strategy", e.target.value)
                    }
                  />
                </label>

                <label className="block space-y-2">
                  <span className={mutedText}>Screenshot URL</span>
                  <input
                    type="url"
                    className={inputStyle}
                    placeholder="Direct image URL"
                    value={form.screenshotUrl}
                    onChange={(e) =>
                      updateForm("screenshotUrl", e.target.value)
                    }
                  />
                </label>
              </div>

              {form.screenshotUrl && (
                <div className="mt-5 rounded-xl border border-border bg-surface-raised p-4">
                  <p className="mb-3 text-sm font-medium">
                    Screenshot Preview
                  </p>

                  <img
                    src={form.screenshotUrl}
                    alt="Trade screenshot preview"
                    className="max-h-80 max-w-full rounded-lg object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                    onLoad={(e) => {
                      e.currentTarget.style.display = "block";
                    }}
                  />
                </div>
              )}

              <label className="mt-5 block space-y-2">
                <span className={mutedText}>Trade Notes</span>
                <textarea
                  rows={4}
                  className={`${inputStyle} resize-y`}
                  placeholder="Entry reasoning, execution, mistakes and lessons..."
                  value={form.notes}
                  onChange={(e) =>
                    updateForm("notes", e.target.value)
                  }
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
              <label className="flex cursor-pointer items-center gap-3 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={form.isPublic}
                  onChange={(e) =>
                    updateForm("isPublic", e.target.checked)
                  }
                  className="h-4 w-4 accent-current"
                />
                Share this trade with Copy Trading visitors
              </label>
              <p className="w-full text-xs leading-5 text-muted">Only approved Copy Trading members can view shared trade details. Broker synced verified performance is calculated separately from these entries.</p>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center rounded-xl bg-foreground px-6 py-3 text-sm font-semibold text-background transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving Trade..." : "Save Trade →"}
              </button>
            </div>
          </form>
        </section>

        {/* Trade History */}
        <section>
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Performance Records
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">
                Trade History
              </h2>
              <p className="mt-2 text-sm text-muted">
                Review your recorded trades and outcomes.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {["ALL", "OPEN", "WIN", "LOSS"].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  aria-pressed={filter === item}
                  className={`rounded-lg border px-4 py-2.5 text-xs font-medium transition ${
                    filter === item
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-surface text-muted hover:bg-surface-raised hover:text-foreground"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {!loading && (
            <p className="mb-4 text-xs text-muted">
              Showing {filteredTrades.length} of {trades.length} trades
            </p>
          )}

          {loading ? (
            <div className={`${panelStyle} px-5 py-16 text-center`}>
              <p className="text-sm text-muted">Loading trades...</p>
            </div>
          ) : filteredTrades.length === 0 ? (
            <div className={`${panelStyle} px-5 py-16 text-center`}>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-raised text-xl">
                —
              </div>
              <h3 className="mt-4 font-semibold">No trades found</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">
                {trades.length === 0
                  ? "Your trade history is empty. Record your first trade above to start tracking your performance."
                  : "No trades match this filter. Try selecting another category."}
              </p>
              {filter !== "ALL" && trades.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFilter("ALL")}
                  className="mt-5 rounded-lg border border-border px-4 py-2 text-sm transition hover:bg-surface-raised"
                >
                  View all trades
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {filteredTrades.map((trade) => {
                const result =
                  Number(trade.pnl || 0) - Number(trade.fees || 0);

                return (
                  <article
                    key={trade.id}
                    className={`${panelStyle} overflow-hidden p-5 sm:p-6`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="break-words text-xl font-semibold tracking-tight">
                          {trade.symbol}
                        </h3>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-md border border-border px-2.5 py-1 text-xs font-medium">
                            {trade.direction}
                          </span>
                          <span className="rounded-md border border-border px-2.5 py-1 text-xs text-muted">
                            {trade.status}
                          </span>
                          {trade.source === "MT5" && (
                            <span className="rounded-md border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                              MT5 auto
                            </span>
                          )}
                        </div>

                        <p className="mt-3 text-xs text-muted">
                          {new Date(trade.openedAt).toLocaleString()}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-muted">
                          {trade.status === "OPEN"
                            ? "Trade Status"
                            : "Net Result"}
                        </p>
                        <p className="mt-2 break-words text-lg font-semibold tabular-nums">
                          {trade.status === "OPEN" ? "OPEN" : money(result)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-xl border border-border bg-surface-raised p-3">
                        <p className={smallLabel}>Entry</p>
                        <p className="mt-2 break-all text-sm font-medium tabular-nums">
                          {trade.entryPrice}
                        </p>
                      </div>

                      <div className="rounded-xl border border-border bg-surface-raised p-3">
                        <p className={smallLabel}>Exit</p>
                        <p className="mt-2 break-all text-sm font-medium tabular-nums">
                          {trade.exitPrice ?? "—"}
                        </p>
                      </div>

                      {trade.status === "OPEN" && (
                        <div className="rounded-xl border border-border bg-surface-raised p-3">
                          <p className={smallLabel}>Current price</p>
                          <p className="mt-2 break-all text-sm font-medium tabular-nums">
                            {trade.currentPrice ?? trade.entryPrice}
                          </p>
                        </div>
                      )}

                      <div className="rounded-xl border border-border bg-surface-raised p-3">
                        <p className={smallLabel}>Stop Loss</p>
                        <p className="mt-2 break-all text-sm font-medium tabular-nums">
                          {trade.stopLoss ?? "—"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-border bg-surface-raised p-3">
                        <p className={smallLabel}>Take Profit</p>
                        <p className="mt-2 break-all text-sm font-medium tabular-nums">
                          {trade.takeProfit ?? "—"}
                        </p>
                      </div>
                    </div>

                    {trade.status === "OPEN" && (
                      <div className="mt-5 grid gap-3 rounded-xl border border-border bg-surface-raised p-4 md:grid-cols-2">
                        <form onSubmit={(event) => void updateMarketPrice(event, trade)} className="flex flex-wrap items-end gap-2">
                          <label className="min-w-36 flex-1 text-xs text-muted">Update current market price
                            <input name="currentPrice" required type="number" min="0.0000001" step="any" defaultValue={trade.currentPrice ?? trade.entryPrice} className={`${inputStyle} mt-1`} />
                          </label>
                          <button type="submit" disabled={saving} className="rounded-lg border border-border px-3 py-2.5 text-xs font-semibold disabled:opacity-50">Update mark</button>
                        </form>
                        <form onSubmit={(event) => void closeTrade(event, trade)} className="flex flex-wrap items-end gap-2">
                          <label className="min-w-28 flex-1 text-xs text-muted">Exit price
                            <input name="exitPrice" required type="number" min="0.0000001" step="any" defaultValue={trade.currentPrice ?? ""} className={`${inputStyle} mt-1`} />
                          </label>
                          <label className="min-w-28 flex-1 text-xs text-muted">Realized P&amp;L (USD)
                            <input name="pnl" required type="number" step="any" defaultValue="0" className={`${inputStyle} mt-1`} />
                          </label>
                          <button type="submit" disabled={saving} className="rounded-lg bg-foreground px-3 py-2.5 text-xs font-semibold text-background disabled:opacity-50">Close trade</button>
                        </form>
                      </div>
                    )}

                    {trade.strategy && (
                      <div className="mt-5">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted">
                          Strategy
                        </p>
                        <p className="mt-2 text-sm leading-6">
                          {trade.strategy}
                        </p>
                      </div>
                    )}

                    {trade.notes && (
                      <div className="mt-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted">
                          Notes
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">
                          {trade.notes}
                        </p>
                      </div>
                    )}

                    {trade.screenshotUrl && (
                      <div className="mt-5">
                        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">
                          Trade Screenshot
                        </p>

                        <a
                          href={trade.screenshotUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block overflow-hidden rounded-xl border border-border bg-surface-raised transition hover:opacity-85"
                        >
                          <img
                            src={trade.screenshotUrl}
                            alt={`${trade.symbol} trade screenshot`}
                            loading="lazy"
                            className="max-h-96 w-full object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                          <span className="block border-t border-border px-4 py-3 text-sm text-muted">
                            Open full screenshot ↗
                          </span>
                        </a>
                      </div>
                    )}

                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                      <span className="text-xs text-muted">
                        {trade.isPublic ? "Public trade" : "Private trade"}
                      </span>

                      <button
                        type="button"
                        onClick={() => void deleteTrade(trade.id)}
                        className="rounded-lg border border-border px-3 py-2 text-xs font-medium transition hover:bg-surface-raised"
                      >
                        Delete trade
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <footer className="mt-12 border-t border-border py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold tracking-wide">
              MIVO CAPITAL
            </p>
            <p className="text-xs text-muted">
              Trade with structure. Review with discipline.
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
