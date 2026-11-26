"use client";

import { useEffect, useMemo, useState } from "react";

type PlanInterval = "monthly" | "annually";
type PlanOption = { configured: boolean; amount: number | null; currency: string | null };
type PlanResponse = { monthly: PlanOption; annually: PlanOption; error?: string };

const benefits = [
  "VIP trading signals",
  "Advanced Mivo Academy access",
  "Daily live streams",
  "MT5 connectivity and automated journaling",
  "One-on-one mentorship",
  "Access to a Mivo mentor at any time",
];

function formatPlanAmount(amount: number, currency: string): string | null {
  try {
    const fractionDigits = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
    const value = amount / (10 ** fractionDigits);
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value);
  } catch {
    return null;
  }
}

export function MivoProModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [plans, setPlans] = useState<PlanResponse | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<PlanInterval>("monthly");
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingPlans(true);
    setError("");
    void fetch("/api/vip-membership/plans", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as PlanResponse;
        if (!response.ok) throw new Error(result.error || "Unable to load Mivo Pro plans.");
        if (!cancelled) setPlans(result);
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Unable to load Mivo Pro plans.");
      })
      .finally(() => {
        if (!cancelled) setLoadingPlans(false);
      });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelled = true;
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  const annualDiscount = useMemo(() => {
    const monthly = plans?.monthly;
    const annual = plans?.annually;
    if (!monthly?.configured || !annual?.configured || !monthly.amount || !annual.amount || monthly.currency !== annual.currency) return 0;
    const annualAtMonthlyRate = monthly.amount * 12;
    if (annual.amount >= annualAtMonthlyRate) return 0;
    return Math.round((1 - annual.amount / annualAtMonthlyRate) * 100);
  }, [plans]);

  if (!open) return null;

  const selectedPlan = plans?.[selectedInterval];
  const selectedAvailable = selectedPlan?.configured === true;
  const selectedAmount = selectedPlan?.amount;
  const selectedCurrency = selectedPlan?.currency;
  const formattedAmount = selectedAmount && selectedCurrency
    ? formatPlanAmount(selectedAmount, selectedCurrency)
    : null;

  async function startCheckout() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/vip-membership/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval: selectedInterval }),
      });
      const result = await response.json() as { authorizationUrl?: string; error?: string };
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok || !result.authorizationUrl) throw new Error(result.error || "Unable to open secure checkout.");
      window.location.assign(result.authorizationUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to open secure checkout.");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[150] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="mivo-pro-title"
        className="max-h-[94svh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-border bg-surface p-5 text-foreground shadow-2xl sm:rounded-3xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.22em] text-accent">One membership · full access</p>
            <h2 id="mivo-pro-title" className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Mivo Pro</h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-muted">One subscription for Mivo’s premium trading tools, learning, signals and mentorship.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close Mivo Pro" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-lg text-muted hover:bg-surface-raised hover:text-foreground">×</button>
        </div>

        <div className="mt-5 grid grid-cols-2 rounded-xl border border-border bg-background p-1" aria-label="Mivo Pro billing interval">
          <button type="button" onClick={() => setSelectedInterval("monthly")} aria-pressed={selectedInterval === "monthly"} className={`min-h-10 rounded-lg px-3 text-sm font-semibold transition ${selectedInterval === "monthly" ? "bg-foreground text-background" : "text-muted hover:text-foreground"}`}>Monthly</button>
          <button type="button" onClick={() => setSelectedInterval("annually")} aria-pressed={selectedInterval === "annually"} className={`min-h-10 rounded-lg px-3 text-sm font-semibold transition ${selectedInterval === "annually" ? "bg-foreground text-background" : "text-muted hover:text-foreground"}`}>
            Yearly{annualDiscount > 0 ? <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] text-accent">Save {annualDiscount}%</span> : null}
          </button>
        </div>

        <div className="mt-4 min-h-[74px] rounded-xl border border-border bg-background/70 p-4">
          {loadingPlans ? <p className="text-sm text-muted">Loading current Mivo Pro pricing…</p> : selectedAvailable && formattedAmount ? (
            <>
              <p className="text-2xl font-black tabular-nums">{formattedAmount}<span className="ml-2 text-xs font-medium text-muted">/ {selectedInterval === "monthly" ? "month" : "year"}</span></p>
              {selectedInterval === "annually" && annualDiscount > 0 && <p className="mt-1 text-xs font-semibold text-accent">{annualDiscount}% less than paying monthly for a year</p>}
            </>
          ) : selectedAvailable ? <p className="text-sm leading-6 text-muted">The plan price and currency will be confirmed securely in Paystack before payment.</p> : <p className="text-sm leading-6 text-muted">This billing option is not available yet. Mivo will show it here when the Paystack plan is ready.</p>}
        </div>

        <ul className="mt-5 grid gap-2 sm:grid-cols-2" aria-label="Mivo Pro benefits">
          {benefits.map((benefit) => <li key={benefit} className="flex min-h-11 items-center gap-3 rounded-xl border border-border/80 bg-background/50 px-3 py-2 text-sm">
            <span aria-hidden="true" className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent/10 text-xs font-black text-accent">✓</span>
            <span>{benefit}</span>
          </li>)}
        </ul>

        {(error || (plans && !plans.monthly.configured && !plans.annually.configured)) && <p role="alert" className="mt-4 rounded-xl border border-amber-300/30 bg-amber-300/5 p-3 text-xs leading-5 text-amber-100">{error || "Mivo Pro checkout is being configured. Plans will appear here when they are available."}</p>}

        <button type="button" onClick={() => void startCheckout()} disabled={!selectedAvailable || busy || loadingPlans} className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-accent px-5 py-3 text-sm font-extrabold text-accent-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? "Opening secure checkout…" : selectedAvailable ? `Continue with ${selectedInterval === "monthly" ? "monthly" : "yearly"} plan` : "Plan not available yet"}
        </button>
        <p className="mt-3 text-center text-[11px] leading-5 text-muted">Secure recurring payments are processed by Paystack. The selected plan, amount and renewal interval are shown before payment.</p>
      </section>
    </div>
  );
}
