"use client";

import { useState } from "react";
import Link from "next/link";
import { TRADING_RULES } from "../../lib/trading-rules";

function formatRuleType(type: string) {
  return type.charAt(0) + type.slice(1).toLowerCase();
}

const programs = {
  THREE_STEP: {
    name: "Three-Step Challenge",
    shortName: "Three-Step",
    description:
      "Our most affordable evaluation. Complete three phases and progress toward a Mivo funded account.",

    accounts: [
      { size: "$2,500", price: "$21" },
      { size: "$5,000", price: "$29" },
      { size: "$10,000", price: "$49" },
      { size: "$25,000", price: "$79" },
      { size: "$50,000", price: "$149" },
      { size: "$100,000", price: "$249" },
    ],

  features: [
  "3 Evaluation Phases",
  `Phase 1: ${TRADING_RULES.THREE_STEP.PHASE_1.profitTarget}% Profit Target`,
  `Phase 2: ${TRADING_RULES.THREE_STEP.PHASE_2.profitTarget}% Profit Target`,
  `Phase 3: ${TRADING_RULES.THREE_STEP.PHASE_3.profitTarget}% Profit Target`,
  `${TRADING_RULES.THREE_STEP.PHASE_1.dailyDrawdown}% Daily Drawdown (${formatRuleType(
    TRADING_RULES.THREE_STEP.PHASE_1.dailyDrawdownType
  )})`,
  `${TRADING_RULES.THREE_STEP.PHASE_1.maxDrawdown}% Maximum Drawdown (${formatRuleType(
    TRADING_RULES.THREE_STEP.PHASE_1.maxDrawdownType
  )})`,
  `${TRADING_RULES.THREE_STEP.PHASE_1.minimumTradingDays} Minimum Trading Days Per Phase`,
  `${TRADING_RULES.THREE_STEP.FUNDED.profitSplit}% Profit Split`,
   `Withdrawal Every ${TRADING_RULES.INSTANT.FUNDED.withdrawalDays} Days`,
],
  },

  TWO_STEP: {
    name: "Two-Step Challenge",
    shortName: "Two-Step",
    description:
      "Our flagship evaluation designed to balance achievable objectives, strong risk parameters and competitive pricing.",

    accounts: [
      { size: "$2,500", price: "$25" },
      { size: "$5,000", price: "$32" },
      { size: "$10,000", price: "$59" },
      { size: "$25,000", price: "$119" },
      { size: "$50,000", price: "$219" },
      { size: "$100,000", price: "$329" },
    ],

  features: [
  "2 Evaluation Phases",
  `Phase 1: ${TRADING_RULES.TWO_STEP.PHASE_1.profitTarget}% Profit Target`,
  `Phase 2: ${TRADING_RULES.TWO_STEP.PHASE_2.profitTarget}% Profit Target`,
  `${TRADING_RULES.TWO_STEP.PHASE_1.dailyDrawdown}% Daily Drawdown (${formatRuleType(
    TRADING_RULES.TWO_STEP.PHASE_1.dailyDrawdownType
  )})`,
  `${TRADING_RULES.TWO_STEP.PHASE_1.maxDrawdown}% Maximum Drawdown (${formatRuleType(
    TRADING_RULES.TWO_STEP.PHASE_1.maxDrawdownType
  )})`,
  `${TRADING_RULES.TWO_STEP.PHASE_1.minimumTradingDays} Minimum Trading Days Per Phase`,
  `${TRADING_RULES.TWO_STEP.FUNDED.profitSplit}% Profit Split`,
   `Withdrawal Every ${TRADING_RULES.INSTANT.FUNDED.withdrawalDays} Days`,
],
  },

  ONE_STEP: {
    name: "One-Step Challenge",
    shortName: "One-Step",
    description:
      "Complete one evaluation phase and take the faster route toward a Mivo funded account.",

    accounts: [
      { size: "$2,500", price: "$25" },
      { size: "$5,000", price: "$32" },
      { size: "$10,000", price: "$59" },
      { size: "$25,000", price: "$119" },
      { size: "$50,000", price: "$219" },
      { size: "$100,000", price: "$329" },
    ],

 features: [
  "1 Evaluation Phase",
  `${TRADING_RULES.ONE_STEP.PHASE_1.profitTarget}% Profit Target`,
  `${TRADING_RULES.ONE_STEP.PHASE_1.dailyDrawdown}% Daily Drawdown (${formatRuleType(
    TRADING_RULES.ONE_STEP.PHASE_1.dailyDrawdownType
  )})`,
  `${TRADING_RULES.ONE_STEP.PHASE_1.maxDrawdown}% Maximum Drawdown (${formatRuleType(
    TRADING_RULES.ONE_STEP.PHASE_1.maxDrawdownType
  )})`,
  `${TRADING_RULES.ONE_STEP.PHASE_1.minimumTradingDays} Minimum Trading Days`,
  `${TRADING_RULES.ONE_STEP.PHASE_1.consistencyRule}% Consistency Rule`,
  `${TRADING_RULES.ONE_STEP.FUNDED.profitSplit}% Profit Split`,
   `Withdrawal Every ${TRADING_RULES.INSTANT.FUNDED.withdrawalDays} Days`,
],
  },

  INSTANT: {
    name: "Instant Funding",
    shortName: "Instant",
    description:
      "Skip the evaluation and start directly with a funded-stage account under defined risk parameters.",

    accounts: [
  { size: "$2,500", price: "$22" },
  { size: "$5,000", price: "$29" },
  { size: "$10,000", price: "$49" },
  { size: "$25,000", price: "$99" },
  { size: "$50,000", price: "$119" },
  { size: "$100,000", price: "$299" },
],

   features: [
  "No Evaluation Phase",
  "Instant Funded Account",
  `${TRADING_RULES.INSTANT.FUNDED.dailyDrawdown}% Daily Drawdown (${formatRuleType(
    TRADING_RULES.INSTANT.FUNDED.dailyDrawdownType
  )})`,
  `${TRADING_RULES.INSTANT.FUNDED.maxDrawdown}% Maximum Drawdown (${formatRuleType(
    TRADING_RULES.INSTANT.FUNDED.maxDrawdownType
  )})`,
  `${TRADING_RULES.INSTANT.FUNDED.minimumTradingDays} Minimum Trading Days`,
  `${TRADING_RULES.INSTANT.FUNDED.consistencyRule}% Consistency Rule`,
  `${TRADING_RULES.INSTANT.FUNDED.profitSplit}% Profit Split`,
  `Withdrawal Every ${TRADING_RULES.INSTANT.FUNDED.withdrawalDays} Days`,
],
  },
};

type ProgramKey = keyof typeof programs;

export default function FundingPrograms() {
  const [selectedProgram, setSelectedProgram] =
    useState<ProgramKey>("TWO_STEP");

  const [selectedAccount, setSelectedAccount] = useState(0);

  const program = programs[selectedProgram];
  const account = program.accounts[selectedAccount];

  function changeProgram(programKey: ProgramKey) {
    setSelectedProgram(programKey);
    setSelectedAccount(0);
  }

  const checkoutUrl = `/buy-challenge?program=${selectedProgram}&account=${encodeURIComponent(
    account.size
  )}`;

  return (
    <section
      id="funding-programs"
      className="scroll-mt-36 mx-auto max-w-7xl px-6 py-24"
    >
      {/* HEADING */}
      <div className="text-center">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-500">
          Funding Programs
        </p>

        <h2 className="mt-4 text-4xl font-bold md:text-5xl">
          Choose Your Funding Program
        </h2>

        <p className="mx-auto mt-5 max-w-2xl text-gray-400">
          Select your preferred evaluation path and choose the account size
          that matches your trading goals.
        </p>
      </div>

      {/* PROGRAM TABS */}
      <div className="mx-auto mt-12 grid max-w-5xl grid-cols-2 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 lg:grid-cols-4">
        {(Object.keys(programs) as ProgramKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => changeProgram(key)}
            className={`relative px-4 py-5 font-bold transition sm:px-6 ${
              selectedProgram === key
                ? "bg-green-500 text-black"
                : "text-gray-300 hover:bg-zinc-900"
            }`}
          >
            {programs[key].shortName}

            {key === "TWO_STEP" && (
              <span
                className={`ml-2 hidden rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wide sm:inline-block ${
                  selectedProgram === key
                    ? "bg-black text-white"
                    : "bg-green-500/10 text-green-500"
                }`}
              >
                Popular
              </span>
            )}
          </button>
        ))}
      </div>

      {/* PROGRAM CONTENT */}
      <div
        className={`mt-10 rounded-3xl border bg-zinc-950 p-6 md:p-10 ${
          selectedProgram === "TWO_STEP"
            ? "border-green-500/40"
            : "border-zinc-800"
        }`}
      >
        <div className="grid gap-10 lg:grid-cols-2">
          {/* LEFT */}
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-green-500">
              {program.name}
            </p>

            <h3 className="mt-4 text-3xl font-bold">
              Select Account Size
            </h3>

            <p className="mt-4 max-w-xl leading-7 text-gray-400">
              {program.description}
            </p>

            {/* ACCOUNT SIZES */}
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {program.accounts.map((item, index) => (
                <button
                  key={item.size}
                  type="button"
                  onClick={() => setSelectedAccount(index)}
                  className={`rounded-xl border px-4 py-4 font-bold transition ${
                    selectedAccount === index
                      ? "border-green-500 bg-green-500 text-black"
                      : "border-zinc-700 bg-zinc-900 text-white hover:border-green-500"
                  }`}
                >
                  {item.size}
                </button>
              ))}
            </div>

            {/* RULES */}
            <div className="mt-9 space-y-4">
              {program.features.map((feature) => (
                <div
                  key={feature}
                  className="flex items-center gap-3 text-sm text-gray-300"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-green-500">
                    ✓
                  </span>

                  {feature}
                </div>
              ))}
            </div>
          </div>

          {/* SELECTED ACCOUNT */}
          <div className="flex flex-col justify-between rounded-2xl border border-zinc-800 bg-black p-7 md:p-9">
            <div>
              <p className="text-sm text-gray-500">
                Selected Account
              </p>

              <h3 className="mt-2 text-5xl font-black">
                {account.size}
              </h3>

              <p className="mt-3 text-green-500">
                {program.name}
              </p>

              <div className="my-8 border-t border-zinc-800" />

              <p className="text-sm text-gray-500">
                Account Fee
              </p>

              <p className="mt-2 text-4xl font-black">
                {account.price}
              </p>

              <p className="mt-3 text-xs text-gray-500">
                One-time fee
              </p>
            </div>

            <Link
              href={checkoutUrl}
              className="mt-10 block rounded-xl bg-green-500 px-8 py-4 text-center font-bold text-black transition hover:bg-green-400"
            >
              Get Funded
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}