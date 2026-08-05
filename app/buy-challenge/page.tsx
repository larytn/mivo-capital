"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Navbar from "../../components/Navbar";
import { TRADING_RULES } from "../../lib/trading-rules";

type ProgramKey =
  | "THREE_STEP"
  | "TWO_STEP"
  | "ONE_STEP"
  | "INSTANT";

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
      "Complete three evaluation phases with lower profit targets before progressing to a funded account.",
    accounts: [
      { size: "$2,500", price: 21 },
      { size: "$5,000", price: 29 },
      { size: "$10,000", price: 49 },
      { size: "$25,000", price: 79 },
      { size: "$50,000", price: 149 },
      { size: "$100,000", price: 249 },
    ],
  },

  TWO_STEP: {
    name: "Two-Step Challenge",
    shortName: "Two-Step",
    description:
      "Our flagship evaluation program designed to balance achievable objectives, strong risk parameters and competitive pricing.",
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
      "Complete one evaluation phase and progress toward a Mivo funded account.",
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
      "Skip the evaluation process and start directly with a funded-stage account.",
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

function BuyChallengeContent() {
  const searchParams = useSearchParams();

  const [selectedProgram, setSelectedProgram] =
    useState<ProgramKey>("TWO_STEP");

  const [selectedAccount, setSelectedAccount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [promoCode, setPromoCode] = useState("");
const [discountPercent, setDiscountPercent] = useState(0);
const [appliedPromo, setAppliedPromo] = useState("");
const [promoLoading, setPromoLoading] = useState(false);
const [promoMessage, setPromoMessage] = useState("");

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
  (account.price * discountPercent) / 100;

const finalPrice =
  account.price - discountAmount;

  function changeProgram(programKey: ProgramKey) {
    setSelectedProgram(programKey);
    setSelectedAccount(0);
  }
const applyPromo = async () => {
  try {
    setPromoLoading(true);
    setPromoMessage("");

    const response = await fetch("/api/promo/validate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: promoCode,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setDiscountPercent(0);
      setAppliedPromo("");
      setPromoMessage(data.error || "Invalid promo code.");
      return;
    }

    setDiscountPercent(data.discountPercent);
    setAppliedPromo(data.code);

    setPromoMessage(
      `${data.code} applied — ${data.discountPercent}% off`
    );
  } catch (error) {
    console.error(error);
    setPromoMessage("Unable to apply promo code.");
  } finally {
    setPromoLoading(false);
  }
};
 const handleBuy = async () => {
  try {
    setLoading(true);
const handleCryptoBuy = async () => {
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
      alert(
        "Crypto payment link was not returned."
      );
      return;
    }

    window.location.href = data.link;
  } catch (error) {
    console.error(error);

    alert(
      "Something went wrong while starting crypto payment."
    );
  } finally {
    setLoading(false);
  }
};
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
          amount: account.price,
          promoCode: appliedPromo || null,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      alert(
        data.error || "Unable to initialize payment."
      );
      return;
    }

    if (!data.link) {
      alert(
        "Payment link was not returned. Please try again."
      );
      return;
    }

    window.location.href = data.link;
  } catch (error) {
    console.error(error);

    alert(
      "Something went wrong while starting your payment."
    );
  } finally {
    setLoading(false);
  }
};
const handleCryptoBuy = async () => {
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
    console.error(error);
    alert("Something went wrong.");
  } finally {
    setLoading(false);
  }
};
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
            Select your preferred funding program and account
            size before proceeding to secure checkout.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        {/* PROGRAM TABS */}
        <div className="grid overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 sm:grid-cols-2 lg:grid-cols-4">
          {programOrder.map((key) => {
            const item = programs[key];
            const active = selectedProgram === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => changeProgram(key)}
                className={`relative px-5 py-5 font-bold transition ${
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
          })}
        </div>

        {/* CHECKOUT GRID */}
        <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1.15fr_0.85fr]">

          {/* LEFT COLUMN */}
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
                <span className="rounded-full bg-green-500/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-green-500">
                  Most Popular
                </span>
              )}
            </div>

            <p className="mt-5 max-w-2xl leading-7 text-gray-400">
              {program.description}
            </p>

            {/* ACCOUNT SIZES */}
            <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {program.accounts.map((item, index) => (
                <button
                  key={item.size}
                  type="button"
                  onClick={() => setSelectedAccount(index)}
                  className={`rounded-xl border px-4 py-5 font-bold transition ${
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
            <div className="mt-10 rounded-2xl border border-zinc-800 bg-black p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-500">
                    Trading Rules
                  </p>

                  <h3 className="mt-2 text-xl font-bold">
                    {program.name}
                  </h3>
                </div>

                <span className="rounded-full bg-green-500/10 px-3 py-2 text-xs font-bold text-green-500">
                  {account.size}
                </span>
              </div>

             {/* THREE STEP */}
{selectedProgram === "THREE_STEP" && (
  <div className="mt-6">
    <div className="grid gap-4 sm:grid-cols-3">
      {[
        {
          name: "Phase 1",
          rules: TRADING_RULES.THREE_STEP.PHASE_1,
        },
        {
          name: "Phase 2",
          rules: TRADING_RULES.THREE_STEP.PHASE_2,
        },
        {
          name: "Phase 3",
          rules: TRADING_RULES.THREE_STEP.PHASE_3,
        },
      ].map((phase) => (
        <div
          key={phase.name}
          className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
        >
          <p className="font-bold text-green-500">
            {phase.name}
          </p>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-gray-500">
                Profit Target
              </span>
              <strong>
                {phase.rules.profitTarget}%
              </strong>
            </div>

            <div className="flex justify-between gap-3">
              <span className="text-gray-500">
                Daily DD
              </span>
              <strong>
                {phase.rules.dailyDrawdown}% Static
              </strong>
            </div>

            <div className="flex justify-between gap-3">
              <span className="text-gray-500">
                Max DD
              </span>
              <strong>
                {phase.rules.maxDrawdown}% Static
              </strong>
            </div>

            <div className="flex justify-between gap-3">
              <span className="text-gray-500">
                Min Days
              </span>
              <strong>
                {phase.rules.minimumTradingDays}
              </strong>
            </div>
          </div>
        </div>
      ))}
    </div>

    <div className="mt-4">
      <RuleBox
        label="Profit Split"
        value={`${TRADING_RULES.THREE_STEP.FUNDED.profitSplit}%`}
      />
    </div>
  </div>
)}

  {/* TWO STEP */}
{selectedProgram === "TWO_STEP" && (
  <div className="mt-6">
    <div className="grid gap-4 sm:grid-cols-2">
      {[
        {
          name: "Phase 1",
          rules: TRADING_RULES.TWO_STEP.PHASE_1,
        },
        {
          name: "Phase 2",
          rules: TRADING_RULES.TWO_STEP.PHASE_2,
        },
      ].map((phase) => (
        <div
          key={phase.name}
          className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
        >
          <p className="font-bold text-green-500">
            {phase.name}
          </p>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-gray-500">
                Profit Target
              </span>
              <strong>{phase.rules.profitTarget}%</strong>
            </div>

            <div className="flex justify-between gap-3">
              <span className="text-gray-500">
                Daily DD
              </span>
              <strong>
                {phase.rules.dailyDrawdown}% Static
              </strong>
            </div>

            <div className="flex justify-between gap-3">
              <span className="text-gray-500">
                Max DD
              </span>
              <strong>
                {phase.rules.maxDrawdown}% Static
              </strong>
            </div>

            <div className="flex justify-between gap-3">
              <span className="text-gray-500">
                Min Days
              </span>
              <strong>
                {phase.rules.minimumTradingDays}
              </strong>
            </div>
          </div>
        </div>
      ))}
    </div>

    <div className="mt-4">
      <RuleBox
        label="Profit Split"
        value={`${TRADING_RULES.TWO_STEP.FUNDED.profitSplit}%`}
      />
    </div>
  </div>
)}

           {/* ONE STEP */}
{selectedProgram === "ONE_STEP" && (
  <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
    <RuleBox
      label="Profit Target"
      value={`${TRADING_RULES.ONE_STEP.PHASE_1.profitTarget}%`}
    />

    <RuleBox
      label="Daily Drawdown"
      value={`${TRADING_RULES.ONE_STEP.PHASE_1.dailyDrawdown}% Static`}
    />

    <RuleBox
      label="Maximum Drawdown"
      value={`${TRADING_RULES.ONE_STEP.PHASE_1.maxDrawdown}% Trailing`}
    />

    <RuleBox
      label="Minimum Trading Days"
      value={`${TRADING_RULES.ONE_STEP.PHASE_1.minimumTradingDays} Days`}
    />

    <RuleBox
      label="Consistency Rule"
      value={`${TRADING_RULES.ONE_STEP.PHASE_1.consistencyRule}%`}
    />

    <RuleBox
      label="Profit Split"
      value={`${TRADING_RULES.ONE_STEP.FUNDED.profitSplit}%`}
    />
  </div>
)}

             {/* INSTANT */}
{selectedProgram === "INSTANT" && (
  <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
    <RuleBox
      label="Profit Target"
      value="None"
    />

    <RuleBox
      label="Daily Drawdown"
      value={`${TRADING_RULES.INSTANT.FUNDED.dailyDrawdown}% Static`}
    />

    <RuleBox
      label="Maximum Drawdown"
      value={`${TRADING_RULES.INSTANT.FUNDED.maxDrawdown}% Trailing`}
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
          {/* RIGHT COLUMN — ORDER SUMMARY */}
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
<div className="mt-8">
  <p className="text-sm font-bold">
    Promo Code
  </p>

  <div className="mt-3 flex gap-2">
    <input
      type="text"
      value={promoCode}
      onChange={(e) =>
        setPromoCode(e.target.value.toUpperCase())
      }
      placeholder="Enter promo code"
      className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none focus:border-green-500"
    />

    <button
      type="button"
      onClick={applyPromo}
      disabled={promoLoading || !promoCode.trim()}
      className="rounded-xl border border-green-500 px-5 py-3 text-sm font-bold text-green-500 disabled:opacity-50"
    >
      {promoLoading ? "Applying..." : "Apply"}
    </button>
  </div>

  {promoMessage && (
    <p
      className={`mt-2 text-xs ${
        appliedPromo ? "text-green-500" : "text-red-400"
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
      ${account.price.toFixed(2)}
    </span>
  </div>

  {discountPercent > 0 && (
    <div className="mt-4 flex items-center justify-between text-sm">
      <span className="text-gray-400">
        Discount ({discountPercent}%)
      </span>

      <span className="font-bold text-green-500">
        -${discountAmount.toFixed(2)}
      </span>
    </div>
  )}

  <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-4">
    <span className="font-bold">
      Total
    </span>

    <span className="text-xl font-black text-green-500">
      ${finalPrice.toFixed(2)}
    </span>
  </div>
</div>

          <div className="mt-8 space-y-3">
  <button
    type="button"
    disabled={loading}
    onClick={handleBuy}
    className="w-full rounded-xl bg-green-500 px-8 py-4 font-bold text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {loading
      ? "Preparing Checkout..."
      : `Pay with Card / Bank — $${finalPrice.toFixed(2)}`}
  </button>

  <button
    type="button"
    disabled={loading}
    onClick={handleCryptoBuy}
    className="w-full rounded-xl border border-green-500 px-8 py-4 font-bold text-green-500 transition hover:bg-green-500 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
  >
    {loading
      ? "Preparing Crypto Payment..."
      : `Pay with Crypto — $${finalPrice.toFixed(2)}`}
  </button>
</div>

            <p className="mt-4 text-center text-xs leading-5 text-gray-600">
              By continuing, you confirm that you have
              reviewed the rules applicable to your selected
              Mivo Capital program.
            </p>
          </div>
        </div>

        {/* BACK */}
        <div className="mt-10 text-center">
          <Link
            href="/#funding-programs"
            className="text-sm text-gray-500 transition hover:text-white"
          >
            ← Back to Funding Programs
          </Link>
        </div>
      </section>
    </main>
  );
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
      <p className="text-xs text-gray-500">
        {label}
      </p>

      <p className="mt-2 font-bold text-white">
        {value}
      </p>
    </div>
  );
}
export default function BuyChallengePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <BuyChallengeContent />
    </Suspense>
  );
}