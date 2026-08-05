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
      { size: "$2,500", price: 19 },
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
      { size: "$2,500", price: 29 },
      { size: "$5,000", price: 49 },
      { size: "$10,000", price: 79 },
      { size: "$25,000", price: 149 },
      { size: "$50,000", price: 249 },
      { size: "$100,000", price: 399 },
    ],
  },

  ONE_STEP: {
    name: "One-Step Challenge",
    shortName: "One-Step",
    description:
      "Complete one evaluation phase and take the faster route toward a Mivo funded account.",

    accounts: [
      { size: "$2,500", price: 39 },
      { size: "$5,000", price: 59 },
      { size: "$10,000", price: 99 },
      { size: "$25,000", price: 179 },
      { size: "$50,000", price: 299 },
      { size: "$100,000", price: 499 },
    ],
  },

  INSTANT: {
    name: "Instant Funding",
    shortName: "Instant",
    description:
      "Skip the evaluation phases and start directly with a funded-stage account.",

    accounts: [
      { size: "$2,500", price: 24 },
      { size: "$5,000", price: 39 },
      { size: "$10,000", price: 59 },
      { size: "$25,000", price: 119 },
      { size: "$50,000", price: 199 },
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
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <p className="text-xs text-gray-500">{label}</p>

      <p className="mt-2 font-bold text-white">
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
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
      <p className="font-bold text-green-500">
        {title}
      </p>

      <div className="mt-5 space-y-4 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">
            Profit Target
          </span>

          <span className="font-bold">
            {rules.profitTarget}%
          </span>
        </div>

        <div className="flex justify-between gap-4">
          <span className="text-gray-500">
            Daily Drawdown
          </span>

          <span className="text-right font-bold">
            {rules.dailyDrawdown}%{" "}
            {formatRuleType(
              rules.dailyDrawdownType
            )}
          </span>
        </div>

        <div className="flex justify-between gap-4">
          <span className="text-gray-500">
            Maximum Drawdown
          </span>

          <span className="text-right font-bold">
            {rules.maxDrawdown}%{" "}
            {formatRuleType(
              rules.maxDrawdownType
            )}
          </span>
        </div>

        <div className="flex justify-between gap-4">
          <span className="text-gray-500">
            Minimum Trading Days
          </span>

          <span className="font-bold">
            {rules.minimumTradingDays} Days
          </span>
        </div>

        {rules.consistencyRule !== null && (
          <div className="flex justify-between gap-4">
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

  const [selectedAccount, setSelectedAccount] =
    useState(0);

  const [loading, setLoading] = useState(false);

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("flutterwave");

  // PROMO CODE

  const [promoInput, setPromoInput] =
    useState("");

  const [appliedPromo, setAppliedPromo] =
    useState<string | null>(null);

  const [discountPercent, setDiscountPercent] =
    useState(0);

  const [promoMessage, setPromoMessage] =
    useState("");

  const [promoLoading, setPromoLoading] =
    useState(false);

  useEffect(() => {
    const programParam =
      searchParams.get("program");

    const accountParam =
      searchParams.get("account");

    if (
      !programParam ||
      !programOrder.includes(
        programParam as ProgramKey
      )
    ) {
      return;
    }

    const validProgram =
      programParam as ProgramKey;

    setSelectedProgram(validProgram);

    if (!accountParam) {
      setSelectedAccount(0);
      return;
    }

    const accountIndex =
      programs[
        validProgram
      ].accounts.findIndex(
        (item) =>
          item.size === accountParam
      );

    setSelectedAccount(
      accountIndex >= 0
        ? accountIndex
        : 0
    );
  }, [searchParams]);

  const program =
    programs[selectedProgram];

  const account =
    program.accounts[selectedAccount];

  const discountAmount =
    Math.round(
      account.price *
        (discountPercent / 100) *
        100
    ) / 100;

  const finalPrice =
    Math.round(
      (account.price -
        discountAmount) *
        100
    ) / 100;

  function resetPromo() {
    setPromoInput("");
    setAppliedPromo(null);
    setDiscountPercent(0);
    setPromoMessage("");
  }

  function changeProgram(
    programKey: ProgramKey
  ) {
    setSelectedProgram(programKey);
    setSelectedAccount(0);
    resetPromo();
  }

  function changeAccount(
    index: number
  ) {
    setSelectedAccount(index);
    resetPromo();
  }

  // APPLY PROMO

  async function applyPromo() {
    try {
      if (!promoInput.trim()) {
        setPromoMessage(
          "Enter a promo code first."
        );

        return;
      }

      setPromoLoading(true);
      setPromoMessage("");

      const response = await fetch(
        "/api/promo/validate",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            code: promoInput,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        setAppliedPromo(null);
        setDiscountPercent(0);

        setPromoMessage(
          data.error ||
            "Invalid promo code."
        );

        return;
      }

      setAppliedPromo(data.code);

      setDiscountPercent(
        Number(data.discountPercent)
      );

      setPromoMessage(
        `${data.code} applied — ${data.discountPercent}% off`
      );
    } catch (error) {
      console.error(error);

      setAppliedPromo(null);
      setDiscountPercent(0);

      setPromoMessage(
        "Unable to apply promo code."
      );
    } finally {
      setPromoLoading(false);
    }
  }

  // CRYPTO CHECKOUT

  async function handleCryptoBuy() {
    try {
      setLoading(true);

      const response = await fetch(
        "/api/nowpayments/initialize",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            accountSize:
              account.size,

            challengeType:
              program.name,

            amount:
              finalPrice,

            promoCode:
              appliedPromo || null,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        if (
          response.status === 401
        ) {
          alert(
            "Please login first."
          );

          window.location.href =
            "/login";

          return;
        }

        alert(
          data.error ||
            "Unable to initialize crypto payment."
        );

        return;
      }

      if (!data.link) {
        alert(
          "Crypto payment link was not returned."
        );

        return;
      }

      window.location.href =
        data.link;
    } catch (error) {
      console.error(
        "CRYPTO PAYMENT ERROR:",
        error
      );

      alert(
        "Something went wrong while starting crypto payment."
      );
    } finally {
      setLoading(false);
    }
  }

  // CARD / BANK CHECKOUT

  async function handleCardBuy() {
    try {
      setLoading(true);

      const response = await fetch(
        "/api/flutterwave/initialize",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            accountSize:
              account.size,

            challengeType:
              program.name,

            amount:
              finalPrice,

            promoCode:
              appliedPromo || null,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        if (
          response.status === 401
        ) {
          alert(
            "Please login first."
          );

          window.location.href =
            "/login";

          return;
        }

        alert(
          data.error ||
            "Unable to initialize payment."
        );

        return;
      }

      if (!data.link) {
        alert(
          "Payment link was not returned."
        );

        return;
      }

      window.location.href =
        data.link;
    } catch (error) {
      console.error(
        "CARD PAYMENT ERROR:",
        error
      );

      alert(
        "Something went wrong while starting your payment."
      );
    } finally {
      setLoading(false);
    }
  }

  // MAIN CHECKOUT

  async function handleBuy() {
    if (
      paymentMethod === "crypto"
    ) {
      await handleCryptoBuy();
      return;
    }

    await handleCardBuy();
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      {/* HEADER */}

      <section className="border-b border-zinc-900">
        <div className="mx-auto max-w-7xl px-6 pb-14 pt-20 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-500">
            Mivo Capital
          </p>

          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl md:text-6xl">
            Choose Your Trading Account
          </h1>

          <p className="mx-auto mt-5 max-w-2xl leading-7 text-gray-400">
            Select your funding program,
            account size and review the
            applicable trading rules before
            checkout.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">

        {/* PROGRAM TABS */}

        <div className="grid overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 sm:grid-cols-2 lg:grid-cols-4">
          {programOrder.map(
            (key) => {
              const item =
                programs[key];

              const active =
                selectedProgram === key;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    changeProgram(key)
                  }
                  className={`px-5 py-5 font-bold transition ${
                    active
                      ? "bg-green-500 text-black"
                      : "text-gray-300 hover:bg-zinc-900"
                  }`}
                >
                  {item.shortName}

                  {item.popular && (
                    <span
                      className={`ml-2 rounded-full px-2 py-1 text-[9px] font-black uppercase ${
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
            }
          )}
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">

          {/* LEFT */}

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 md:p-9">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-green-500">
                  {program.name}
                </p>

                <h2 className="mt-3 text-3xl font-black">
                  Select Account Size
                </h2>
              </div>

              {program.popular && (
                <span className="rounded-full bg-green-500/10 px-4 py-2 text-xs font-bold uppercase text-green-500">
                  Most Popular
                </span>
              )}
            </div>

            <p className="mt-5 max-w-2xl leading-7 text-gray-400">
              {program.description}
            </p>

            {/* ACCOUNT SIZES */}

            <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {program.accounts.map(
                (item, index) => (
                  <button
                    key={item.size}
                    type="button"
                    onClick={() =>
                      changeAccount(
                        index
                      )
                    }
                    className={`rounded-xl border px-4 py-5 font-bold transition ${
                      selectedAccount ===
                      index
                        ? "border-green-500 bg-green-500 text-black"
                        : "border-zinc-700 bg-black text-white hover:border-green-500"
                    }`}
                  >
                    {item.size}
                  </button>
                )
              )}
            </div>

            {/* TRADING RULES */}

            <div className="mt-10 rounded-2xl border border-zinc-800 bg-black p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-500">
                    Trading Rules
                  </p>

                  <h3 className="mt-2 text-xl font-bold">
                    {program.name} Rules
                  </h3>
                </div>

                <span className="rounded-full bg-green-500/10 px-3 py-2 text-xs font-bold text-green-500">
                  {account.size}
                </span>
              </div>

              {selectedProgram ===
                "THREE_STEP" && (
                <>
                  <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <PhaseRules
                      title="Phase 1"
                      rules={
                        TRADING_RULES
                          .THREE_STEP
                          .PHASE_1
                      }
                    />

                    <PhaseRules
                      title="Phase 2"
                      rules={
                        TRADING_RULES
                          .THREE_STEP
                          .PHASE_2
                      }
                    />

                    <PhaseRules
                      title="Phase 3"
                      rules={
                        TRADING_RULES
                          .THREE_STEP
                          .PHASE_3
                      }
                    />
                  </div>

                  <div className="mt-4 grid gap-4">
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

              {selectedProgram ===
                "TWO_STEP" && (
                <>
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <PhaseRules
                      title="Phase 1"
                      rules={
                        TRADING_RULES
                          .TWO_STEP
                          .PHASE_1
                      }
                    />

                    <PhaseRules
                      title="Phase 2"
                      rules={
                        TRADING_RULES
                          .TWO_STEP
                          .PHASE_2
                      }
                    />
                  </div>

                  <div className="mt-4 grid gap-4">
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

              {selectedProgram ===
                "ONE_STEP" && (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <PhaseRules
                    title="Evaluation Phase"
                    rules={
                      TRADING_RULES
                        .ONE_STEP
                        .PHASE_1
                    }
                  />

                  <RuleBox
                    label="Profit Split"
                    value={`${TRADING_RULES.ONE_STEP.FUNDED.profitSplit}%`}
                  />

                  <RuleBox
                    label="Withdrawal"
                    value={`Every ${TRADING_RULES.ONE_STEP.FUNDED.withdrawalDays} Days`}
                  />
                </div>
              )}

              {selectedProgram ===
                "INSTANT" && (
                <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <RuleBox
                    label="Profit Target"
                    value="None"
                  />

                  <RuleBox
                    label="Daily Drawdown"
                    value={`${TRADING_RULES.INSTANT.FUNDED.dailyDrawdown}% ${formatRuleType(
                      TRADING_RULES
                        .INSTANT
                        .FUNDED
                        .dailyDrawdownType
                    )}`}
                  />

                  <RuleBox
                    label="Maximum Drawdown"
                    value={`${TRADING_RULES.INSTANT.FUNDED.maxDrawdown}% ${formatRuleType(
                      TRADING_RULES
                        .INSTANT
                        .FUNDED
                        .maxDrawdownType
                    )}`}
                  />

                  <RuleBox
                    label="Minimum Trading Days"
                    value={`${TRADING_RULES.INSTANT.FUNDED.minimumTradingDays} Days`}
                  />

                  <RuleBox
                    label="Consistency Rule"
                    value={`${TRADING_RULES.INSTANT.FUNDED.consistencyRule}%`}
                  />

                  <RuleBox
                    label="Profit Split"
                    value={`${TRADING_RULES.INSTANT.FUNDED.profitSplit}%`}
                  />

                  <RuleBox
                    label="Withdrawal"
                    value={`Every ${TRADING_RULES.INSTANT.FUNDED.withdrawalDays} Days`}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ORDER SUMMARY */}

          <div className="h-fit rounded-3xl border border-green-500/20 bg-zinc-950 p-6 md:p-9 lg:sticky lg:top-28">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-500">
              Order Summary
            </p>

            <div className="mt-7">
              <p className="text-sm text-gray-500">
                Program
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                {program.name}
              </h2>
            </div>

            <div className="mt-7 border-t border-zinc-800 pt-7">
              <p className="text-sm text-gray-500">
                Account Size
              </p>

              <p className="mt-2 text-4xl font-black">
                {account.size}
              </p>
            </div>

            <div className="mt-7 border-t border-zinc-800 pt-7">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500">
                    Account Fee
                  </p>

                  <p className="mt-2 text-4xl font-black text-green-500">
                    ${account.price}
                  </p>
                </div>

                <span className="text-xs text-gray-500">
                  One-time fee
                </span>
              </div>
            </div>

            {/* PROMO CODE */}

            <div className="mt-8 rounded-xl border border-zinc-800 bg-black p-4">
              <p className="text-sm font-bold">
                Promo Code
              </p>

              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={promoInput}
                  onChange={(event) =>
                    setPromoInput(
                      event.target.value.toUpperCase()
                    )
                  }
                  placeholder="Enter promo code"
                  disabled={
                    promoLoading ||
                    appliedPromo !== null
                  }
                  className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-green-500 disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={applyPromo}
                  disabled={
                    promoLoading ||
                    appliedPromo !== null
                  }
                  className="rounded-lg bg-green-500 px-5 py-3 text-sm font-bold text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {promoLoading
                    ? "Applying..."
                    : appliedPromo
                    ? "Applied"
                    : "Apply"}
                </button>
              </div>

              {promoMessage && (
                <p
                  className={`mt-3 text-sm ${
                    appliedPromo
                      ? "text-green-500"
                      : "text-red-400"
                  }`}
                >
                  {promoMessage}
                </p>
              )}
            </div>

            {/* PRICE SUMMARY */}

            <div className="mt-6 rounded-xl border border-zinc-800 bg-black p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">
                  Subtotal
                </span>

                <span className="font-bold">
                  ${account.price}
                </span>
              </div>

              {discountPercent > 0 && (
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-green-500">
                    Discount (
                    {discountPercent}%)
                  </span>

                  <span className="font-bold text-green-500">
                    -$
                    {discountAmount.toFixed(
                      2
                    )}
                  </span>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-4">
                <span className="font-bold">
                  Total
                </span>

                <span className="text-xl font-black text-green-500">
                  $
                  {finalPrice.toFixed(
                    2
                  )}
                </span>
              </div>
            </div>

            {/* PAYMENT METHOD */}

            <div className="mt-6">
              <p className="mb-3 text-sm font-bold">
                Payment Method
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setPaymentMethod(
                      "flutterwave"
                    )
                  }
                  className={`rounded-xl border px-4 py-4 text-sm font-bold transition ${
                    paymentMethod ===
                    "flutterwave"
                      ? "border-green-500 bg-green-500 text-black"
                      : "border-zinc-700 bg-black text-white hover:border-green-500"
                  }`}
                >
                  Card / Bank
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setPaymentMethod(
                      "crypto"
                    )
                  }
                  className={`rounded-xl border px-4 py-4 text-sm font-bold transition ${
                    paymentMethod ===
                    "crypto"
                      ? "border-green-500 bg-green-500 text-black"
                      : "border-zinc-700 bg-black text-white hover:border-green-500"
                  }`}
                >
                  Crypto
                </button>
              </div>

              <p className="mt-3 text-xs text-gray-500">
                {paymentMethod ===
                "flutterwave"
                  ? "Pay securely with card or supported bank payment methods."
                  : "Pay using cryptocurrency."}
              </p>
            </div>

            {/* CHECKOUT */}

            <button
              type="button"
              onClick={handleBuy}
              disabled={loading}
              className="mt-8 w-full rounded-xl bg-green-500 px-6 py-4 font-bold text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Preparing Checkout..."
                : paymentMethod ===
                  "crypto"
                ? `Pay with Crypto — $${finalPrice.toFixed(
                    2
                  )}`
                : `Checkout — $${finalPrice.toFixed(
                    2
                  )}`}
            </button>

            <p className="mt-4 text-center text-xs leading-5 text-gray-600">
              By checking out, you
              confirm that you have
              reviewed the trading rules
              applicable to your selected
              Mivo Capital account.
            </p>
          </div>
        </div>

        {/* BACK */}

        <div className="mt-10 text-center">
          <Link
            href="/dashboard"
            className="text-sm text-gray-500 transition hover:text-white"
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
      fallback={
        <div className="min-h-screen bg-black" />
      }
    >
      <ChallengesContent />
    </Suspense>
  );
}