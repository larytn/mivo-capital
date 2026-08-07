"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import { TRADING_RULES } from "../../lib/trading-rules";

type ProgramKey =
  | "THREE_STEP"
  | "TWO_STEP"
  | "ONE_STEP"
  | "INSTANT";

type PaymentMethod = "flutterwave" | "crypto";

type Account = {
  size: string;
  price: number;
};

type Program = {
  name: string;
  shortName: string;
  description: string;
  accounts: Account[];
  popular?: boolean;
};

const programs: Record<ProgramKey, Program> = {
  THREE_STEP: {
    name: "Three-Step Challenge",
    shortName: "Three-Step",
    description:
      "Complete three evaluation phases with lower profit targets before progressing to a Mivo funded account.",
    accounts: [
      { size: "$2,500", price: 21 },
      { size: "$5,000", price: 29 },
      { size: "$10,000", price: 49 },
      { size: "$25,000", price: 89 },
      { size: "$50,000", price: 149 },
      { size: "$100,000", price: 249 },
    ],
  },

  TWO_STEP: {
    name: "Two-Step Challenge",
    shortName: "Two-Step",
    description:
      "Our flagship evaluation program with balanced profit targets, strong risk parameters and competitive pricing.",
    popular: true,
    accounts: [
      { size: "$2,500", price: 25 },
      { size: "$5,000", price: 32 },
      { size: "$10,000", price: 59 },
      { size: "$25,000", price: 119 },
      { size: "$50,000", price: 219 },
      { size: "$100,000", price: 329 },
    ],
  },

  ONE_STEP: {
    name: "One-Step Challenge",
    shortName: "One-Step",
    description:
      "Complete one evaluation phase and take the faster route toward a Mivo funded account.",
    accounts: [
      { size: "$2,500", price: 25 },
      { size: "$5,000", price: 32 },
      { size: "$10,000", price: 59 },
      { size: "$25,000", price: 119 },
      { size: "$50,000", price: 219 },
      { size: "$100,000", price: 329 },
    ],
  },

  INSTANT: {
    name: "Instant Funding",
    shortName: "Instant",
    description:
      "Skip the evaluation phases and start directly with a funded-stage account.",
    accounts: [
      { size: "$2,500", price: 22 },
      { size: "$5,000", price: 29 },
      { size: "$10,000", price: 49 },
      { size: "$25,000", price: 99 },
      { size: "$50,000", price: 179 },
      { size: "$100,000", price: 299 },
    ],
  },
};

const programOrder: ProgramKey[] = [
  "THREE_STEP",
  "TWO_STEP",
  "ONE_STEP",
  "INSTANT",
];

function formatRuleType(type: string) {
  return type.charAt(0) + type.slice(1).toLowerCase();
}

function RuleBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 sm:p-4">
      <p className="text-[11px] text-gray-500 sm:text-xs">
        {label}
      </p>

      <p className="mt-1.5 text-sm font-bold text-white sm:mt-2 sm:text-base">
        {value}
      </p>
    </div>
  );
}

function PhaseRules({
  title,
  rules,
}: {
  title: string;
  rules: {
    profitTarget: number;
    dailyDrawdown: number;
    dailyDrawdownType: string;
    maxDrawdown: number;
    maxDrawdownType: string;
    minimumTradingDays: number;
    consistencyRule: number | null;
  };
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5">
      <p className="text-sm font-bold text-green-500 sm:text-base">
        {title}
      </p>

      <div className="mt-4 space-y-3 text-xs sm:mt-5 sm:space-y-4 sm:text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-gray-500">Profit Target</span>
          <span className="font-bold">
            {rules.profitTarget}%
          </span>
        </div>

        <div className="flex justify-between gap-3">
          <span className="text-gray-500">Daily Drawdown</span>
          <span className="text-right font-bold">
            {rules.dailyDrawdown}%{" "}
            {formatRuleType(rules.dailyDrawdownType)}
          </span>
        </div>

        <div className="flex justify-between gap-3">
          <span className="text-gray-500">Maximum Drawdown</span>
          <span className="text-right font-bold">
            {rules.maxDrawdown}%{" "}
            {formatRuleType(rules.maxDrawdownType)}
          </span>
        </div>

        <div className="flex justify-between gap-3">
          <span className="text-gray-500">
            Minimum Trading Days
          </span>
          <span className="font-bold">
            {rules.minimumTradingDays} Days
          </span>
        </div>

        {rules.consistencyRule !== null && (
          <div className="flex justify-between gap-3">
            <span className="text-gray-500">
              Consistency Rule
            </span>
            <span className="font-bold">
              {rules.consistencyRule}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function ChallengesContent() {
  const searchParams = useSearchParams();

  const [selectedProgram, setSelectedProgram] =
    useState<ProgramKey>("TWO_STEP");
  const [selectedAccount, setSelectedAccount] = useState(0);
  const [loading, setLoading] = useState(false);

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("flutterwave");

  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] =
    useState<string | null>(null);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [promoMessage, setPromoMessage] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);

  useEffect(() => {
    const programParam = searchParams.get("program");
    const accountParam = searchParams.get("account");

    if (
      !programParam ||
      !programOrder.includes(programParam as ProgramKey)
    ) {
      return;
    }

    const validProgram = programParam as ProgramKey;

    setSelectedProgram(validProgram);

    if (!accountParam) {
      setSelectedAccount(0);
      return;
    }

    const accountIndex =
      programs[validProgram].accounts.findIndex(
        (item) => item.size === accountParam
      );

    setSelectedAccount(accountIndex >= 0 ? accountIndex : 0);
  }, [searchParams]);

  const program = programs[selectedProgram];
  const account = program.accounts[selectedAccount];

  const discountAmount =
    Math.round(
      account.price * (discountPercent / 100) * 100
    ) / 100;

  const finalPrice =
    Math.round((account.price - discountAmount) * 100) / 100;

  function resetPromo() {
    setPromoInput("");
    setAppliedPromo(null);
    setDiscountPercent(0);
    setPromoMessage("");
  }

  function changeProgram(programKey: ProgramKey) {
    setSelectedProgram(programKey);
    setSelectedAccount(0);
    resetPromo();
  }

  function changeAccount(index: number) {
    setSelectedAccount(index);
    resetPromo();
  }

  async function applyPromo() {
    try {
      if (!promoInput.trim()) {
        setPromoMessage("Enter a promo code first.");
        return;
      }

      setPromoLoading(true);
      setPromoMessage("");

      const response = await fetch("/api/promo/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: promoInput,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setAppliedPromo(null);
        setDiscountPercent(0);
        setPromoMessage(data.error || "Invalid promo code.");
        return;
      }

      setAppliedPromo(data.code);
      setDiscountPercent(Number(data.discountPercent));

      setPromoMessage(
        `${data.code} applied — ${data.discountPercent}% off`
      );
    } catch (error) {
      console.error(error);

      setAppliedPromo(null);
      setDiscountPercent(0);
      setPromoMessage("Unable to apply promo code.");
    } finally {
      setPromoLoading(false);
    }
  }

  async function handleCryptoBuy() {
    try {
      setLoading(true);

      const response = await fetch(
        "/api/nowpayments/initialize",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accountSize: account.size,
            challengeType: program.name,
            amount: finalPrice,
            promoCode: appliedPromo || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          alert("Please login first.");
          window.location.href = "/login";
          return;
        }

        alert(
          data.error ||
            "Unable to initialize crypto payment."
        );
        return;
      }

      if (!data.link) {
        alert("Crypto payment link was not returned.");
        return;
      }

      window.location.href = data.link;
    } catch (error) {
      console.error("CRYPTO PAYMENT ERROR:", error);

      alert(
        "Something went wrong while starting crypto payment."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCardBuy() {
    try {
      setLoading(true);

      const response = await fetch(
        "/api/flutterwave/initialize",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accountSize: account.size,
            challengeType: program.name,
            amount: finalPrice,
            promoCode: appliedPromo || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          alert("Please login first.");
          window.location.href = "/login";
          return;
        }

        alert(data.error || "Unable to initialize payment.");
        return;
      }

      if (!data.link) {
        alert("Payment link was not returned.");
        return;
      }

      window.location.href = data.link;
    } catch (error) {
      console.error("CARD PAYMENT ERROR:", error);

      alert(
        "Something went wrong while starting your payment."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleBuy() {
    if (paymentMethod === "crypto") {
      await handleCryptoBuy();
      return;
    }

    await handleCardBuy();
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      {/* MOBILE-FRIENDLY HEADER */}
      <section className="border-b border-zinc-900">
        <div className="mx-auto max-w-7xl px-4 py-8 text-center sm:px-6 sm:py-14 lg:py-16">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-green-500 sm:text-sm">
            Mivo Capital
          </p>

          <h1 className="mx-auto mt-3 max-w-3xl text-3xl font-black leading-tight tracking-tight sm:mt-4 sm:text-5xl lg:text-6xl">
            Choose Your Trading Account
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-400 sm:mt-5 sm:text-base sm:leading-7">
            Choose a funding program, select your account size
            and checkout.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:py-14">
        {/* PROGRAM TABS */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-0 sm:overflow-hidden sm:rounded-2xl sm:border sm:border-zinc-800 sm:bg-zinc-950">
          {programOrder.map((key) => {
            const item = programs[key];
            const active = selectedProgram === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => changeProgram(key)}
                className={`relative min-h-[52px] rounded-xl border px-2 py-3 text-xs font-bold transition sm:min-h-[64px] sm:rounded-none sm:border-0 sm:px-5 sm:py-5 sm:text-sm ${
                  active
                    ? "border-green-500 bg-green-500 text-black"
                    : "border-zinc-800 bg-zinc-950 text-gray-300 hover:border-green-500"
                }`}
              >
                {item.shortName}

                {item.popular && (
                  <span
                    className={`ml-1 rounded-full px-1.5 py-0.5 text-[7px] font-black uppercase sm:ml-2 sm:px-2 sm:py-1 sm:text-[9px] ${
                      active
                        ? "bg-black text-white"
                        : "bg-green-500/10 text-green-500"
                    }`}
                  >
                    Popular
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid gap-5 sm:mt-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8">
          {/* ACCOUNT + RULES */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:rounded-3xl sm:p-7 lg:p-9">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-green-500 sm:text-sm">
                  {program.name}
                </p>

                <h2 className="mt-2 text-xl font-black sm:mt-3 sm:text-3xl">
                  Select Account Size
                </h2>
              </div>

              {program.popular && (
                <span className="shrink-0 rounded-full bg-green-500/10 px-2.5 py-1.5 text-[9px] font-bold uppercase text-green-500 sm:px-4 sm:py-2 sm:text-xs">
                  Popular
                </span>
              )}
            </div>

            <p className="mt-3 text-xs leading-5 text-gray-400 sm:mt-5 sm:text-base sm:leading-7">
              {program.description}
            </p>

            {/* ACCOUNT SIZES */}
            <div className="mt-5 grid grid-cols-3 gap-2 sm:mt-8 sm:gap-3">
              {program.accounts.map((item, index) => (
                <button
                  key={item.size}
                  type="button"
                  onClick={() => changeAccount(index)}
                  className={`rounded-xl border px-2 py-3.5 text-sm font-bold transition sm:px-4 sm:py-5 sm:text-base ${
                    selectedAccount === index
                      ? "border-green-500 bg-green-500 text-black"
                      : "border-zinc-700 bg-black text-white hover:border-green-500"
                  }`}
                >
                  {item.size}
                </button>
              ))}
            </div>

            {/* TRADING RULES */}
            <div className="mt-6 rounded-2xl border border-zinc-800 bg-black p-4 sm:mt-10 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-500 sm:text-xs">
                    Trading Rules
                  </p>

                  <h3 className="mt-1.5 text-base font-bold sm:mt-2 sm:text-xl">
                    {program.shortName} Rules
                  </h3>
                </div>

                <span className="shrink-0 rounded-full bg-green-500/10 px-2.5 py-1.5 text-[10px] font-bold text-green-500 sm:px-3 sm:py-2 sm:text-xs">
                  {account.size}
                </span>
              </div>

              {selectedProgram === "THREE_STEP" && (
                <>
                  <div className="mt-4 grid gap-3 sm:mt-6 md:grid-cols-3">
                    <PhaseRules
                      title="Phase 1"
                      rules={TRADING_RULES.THREE_STEP.PHASE_1}
                    />

                    <PhaseRules
                      title="Phase 2"
                      rules={TRADING_RULES.THREE_STEP.PHASE_2}
                    />

                    <PhaseRules
                      title="Phase 3"
                      rules={TRADING_RULES.THREE_STEP.PHASE_3}
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 sm:mt-4">
                    <RuleBox
                      label="Profit Split"
                      value={`${TRADING_RULES.THREE_STEP.FUNDED.profitSplit}%`}
                    />

                    <RuleBox
                      label="Withdrawal"
                      value={`Every ${TRADING_RULES.THREE_STEP.FUNDED.withdrawalDays} Days`}
                    />
                  </div>
                </>
              )}

              {selectedProgram === "TWO_STEP" && (
                <>
                  <div className="mt-4 grid gap-3 sm:mt-6 md:grid-cols-2">
                    <PhaseRules
                      title="Phase 1"
                      rules={TRADING_RULES.TWO_STEP.PHASE_1}
                    />

                    <PhaseRules
                      title="Phase 2"
                      rules={TRADING_RULES.TWO_STEP.PHASE_2}
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 sm:mt-4">
                    <RuleBox
                      label="Profit Split"
                      value={`${TRADING_RULES.TWO_STEP.FUNDED.profitSplit}%`}
                    />

                    <RuleBox
                      label="Withdrawal"
                      value={`Every ${TRADING_RULES.TWO_STEP.FUNDED.withdrawalDays} Days`}
                    />
                  </div>
                </>
              )}

              {selectedProgram === "ONE_STEP" && (
                <>
                  <div className="mt-4 sm:mt-6">
                    <PhaseRules
                      title="Evaluation Phase"
                      rules={TRADING_RULES.ONE_STEP.PHASE_1}
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <RuleBox
                      label="Profit Split"
                      value={`${TRADING_RULES.ONE_STEP.FUNDED.profitSplit}%`}
                    />

                    <RuleBox
                      label="Withdrawal"
                      value={`Every ${TRADING_RULES.ONE_STEP.FUNDED.withdrawalDays} Days`}
                    />
                  </div>
                </>
              )}

              {selectedProgram === "INSTANT" && (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-6 sm:grid-cols-3">
                  <RuleBox label="Profit Target" value="None" />

                  <RuleBox
                    label="Daily Drawdown"
                    value={`${TRADING_RULES.INSTANT.FUNDED.dailyDrawdown}% ${formatRuleType(
                      TRADING_RULES.INSTANT.FUNDED.dailyDrawdownType
                    )}`}
                  />

                  <RuleBox
                    label="Maximum Drawdown"
                    value={`${TRADING_RULES.INSTANT.FUNDED.maxDrawdown}% ${formatRuleType(
                      TRADING_RULES.INSTANT.FUNDED.maxDrawdownType
                    )}`}
                  />

                  <RuleBox
                    label="Min. Trading Days"
                    value={`${TRADING_RULES.INSTANT.FUNDED.minimumTradingDays} Days`}
                  />

                  <RuleBox
                    label="Consistency"
                    value={`${TRADING_RULES.INSTANT.FUNDED.consistencyRule}%`}
                  />

                  <RuleBox
                    label="Profit Split"
                    value={`${TRADING_RULES.INSTANT.FUNDED.profitSplit}%`}
                  />

                  <div className="col-span-2 sm:col-span-1">
                    <RuleBox
                      label="Withdrawal"
                      value={`Every ${TRADING_RULES.INSTANT.FUNDED.withdrawalDays} Days`}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ORDER SUMMARY */}
          <div className="h-fit rounded-2xl border border-green-500/20 bg-zinc-950 p-4 sm:rounded-3xl sm:p-7 lg:sticky lg:top-28 lg:p-9">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-500 sm:text-sm">
                  Order Summary
                </p>

                <h2 className="mt-2 text-lg font-bold sm:text-2xl">
                  {program.name}
                </h2>
              </div>

              <div className="text-right">
                <p className="text-xs text-gray-500">
                  Account
                </p>

                <p className="mt-1 text-xl font-black sm:text-2xl">
                  {account.size}
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-end justify-between border-t border-zinc-800 pt-5">
              <div>
                <p className="text-xs text-gray-500">
                  Account Fee
                </p>

                <p className="mt-1 text-3xl font-black text-green-500 sm:text-4xl">
                  ${account.price}
                </p>
              </div>

              <span className="pb-1 text-[10px] text-gray-500 sm:text-xs">
                One-time fee
              </span>
            </div>

            {/* PROMO */}
            <div className="mt-5 rounded-xl border border-zinc-800 bg-black p-3.5 sm:mt-7 sm:p-4">
              <p className="text-xs font-bold sm:text-sm">
                Promo Code
              </p>

              <div className="mt-2.5 flex gap-2 sm:mt-3">
                <input
                  type="text"
                  value={promoInput}
                  onChange={(event) =>
                    setPromoInput(
                      event.target.value.toUpperCase()
                    )
                  }
                  placeholder="Promo code"
                  disabled={
                    promoLoading || appliedPromo !== null
                  }
                  className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-xs text-white outline-none transition placeholder:text-gray-600 focus:border-green-500 disabled:opacity-60 sm:px-4 sm:py-3 sm:text-sm"
                />

                <button
                  type="button"
                  onClick={applyPromo}
                  disabled={
                    promoLoading || appliedPromo !== null
                  }
                  className="shrink-0 rounded-lg bg-green-500 px-4 py-2.5 text-xs font-bold text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50 sm:px-5 sm:py-3 sm:text-sm"
                >
                  {promoLoading
                    ? "..."
                    : appliedPromo
                    ? "Applied"
                    : "Apply"}
                </button>
              </div>

              {promoMessage && (
                <p
                  className={`mt-2 text-xs sm:mt-3 sm:text-sm ${
                    appliedPromo
                      ? "text-green-500"
                      : "text-red-400"
                  }`}
                >
                  {promoMessage}
                </p>
              )}
            </div>

            {/* PRICE */}
            <div className="mt-4 rounded-xl border border-zinc-800 bg-black p-3.5 sm:mt-5 sm:p-4">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-gray-400">
                  Subtotal
                </span>
                <span className="font-bold">
                  ${account.price.toFixed(2)}
                </span>
              </div>

              {discountPercent > 0 && (
                <div className="mt-2.5 flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-green-500">
                    Discount ({discountPercent}%)
                  </span>

                  <span className="font-bold text-green-500">
                    -${discountAmount.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="mt-3 flex items-center justify-between border-t border-zinc-800 pt-3 sm:mt-4 sm:pt-4">
                <span className="text-sm font-bold">
                  Total
                </span>

                <span className="text-xl font-black text-green-500">
                  ${finalPrice.toFixed(2)}
                </span>
              </div>
            </div>

            {/* PAYMENT METHOD */}
            <div className="mt-5">
              <p className="mb-2.5 text-xs font-bold sm:mb-3 sm:text-sm">
                Payment Method
              </p>

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setPaymentMethod("flutterwave")
                  }
                  className={`rounded-xl border px-3 py-3 text-xs font-bold transition sm:px-4 sm:py-4 sm:text-sm ${
                    paymentMethod === "flutterwave"
                      ? "border-green-500 bg-green-500 text-black"
                      : "border-zinc-700 bg-black text-white hover:border-green-500"
                  }`}
                >
                  Card / Bank
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setPaymentMethod("crypto")
                  }
                  className={`rounded-xl border px-3 py-3 text-xs font-bold transition sm:px-4 sm:py-4 sm:text-sm ${
                    paymentMethod === "crypto"
                      ? "border-green-500 bg-green-500 text-black"
                      : "border-zinc-700 bg-black text-white hover:border-green-500"
                  }`}
                >
                  Crypto
                </button>
              </div>
            </div>

            {/* CHECKOUT */}
            <button
              type="button"
              onClick={handleBuy}
              disabled={loading}
              className="mt-5 w-full rounded-xl bg-green-500 px-5 py-3.5 text-sm font-black text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50 sm:mt-7 sm:px-6 sm:py-4 sm:text-base"
            >
              {loading
                ? "Preparing Checkout..."
                : paymentMethod === "crypto"
                ? `Pay with Crypto — $${finalPrice.toFixed(2)}`
                : `Checkout — $${finalPrice.toFixed(2)}`}
            </button>

            <p className="mt-3 text-center text-[10px] leading-4 text-gray-600 sm:mt-4 sm:text-xs sm:leading-5">
              By checking out, you confirm that you have
              reviewed the applicable Mivo Capital trading
              rules.
            </p>
          </div>
        </div>

        <div className="mt-7 text-center sm:mt-10">
          <Link
            href="/dashboard"
            className="text-xs text-gray-500 transition hover:text-white sm:text-sm"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function ChallengesPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen bg-black" />}
    >
      <ChallengesContent />
    </Suspense>
  );
}