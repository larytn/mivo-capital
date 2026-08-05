"use client";

import { useState } from "react";
import Link from "next/link";
import { TRADING_RULES } from "../../lib/trading-rules";

type ProgramKey =
  | "THREE_STEP"
  | "TWO_STEP"
  | "ONE_STEP"
  | "INSTANT";

function formatRuleType(type: string) {
  return type.charAt(0) + type.slice(1).toLowerCase();
}

function Rule({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-4">
      <span className="text-sm text-gray-400">{label}</span>

      <span className="text-right text-sm font-bold text-white">
        {value}
      </span>
    </div>
  );
}

const programTabs: {
  key: ProgramKey;
  name: string;
  popular?: boolean;
}[] = [
  {
    key: "THREE_STEP",
    name: "Three-Step",
  },
  {
    key: "TWO_STEP",
    name: "Two-Step",
    popular: true,
  },
  {
    key: "ONE_STEP",
    name: "One-Step",
  },
  {
    key: "INSTANT",
    name: "Instant",
  },
];

export default function TradingRules() {
  const [selectedProgram, setSelectedProgram] =
    useState<ProgramKey>("TWO_STEP");

  const threeStepP1 = TRADING_RULES.THREE_STEP.PHASE_1;
  const threeStepP2 = TRADING_RULES.THREE_STEP.PHASE_2;
  const threeStepP3 = TRADING_RULES.THREE_STEP.PHASE_3;
  const threeStepFunded = TRADING_RULES.THREE_STEP.FUNDED;

  const twoStepP1 = TRADING_RULES.TWO_STEP.PHASE_1;
  const twoStepP2 = TRADING_RULES.TWO_STEP.PHASE_2;
  const twoStepFunded = TRADING_RULES.TWO_STEP.FUNDED;

  const oneStep = TRADING_RULES.ONE_STEP.PHASE_1;
  const oneStepFunded = TRADING_RULES.ONE_STEP.FUNDED;

  const instant = TRADING_RULES.INSTANT.FUNDED;

  return (
    <section
      id="trading-rules"
      className="scroll-mt-36 border-t border-zinc-900 bg-black py-24"
    >
      <div className="mx-auto max-w-7xl px-6">
        {/* HEADING */}
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-500">
            Trading Rules
          </p>

          <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
            Know the Rules Before You Trade
          </h2>

          <p className="mx-auto mt-5 max-w-2xl leading-7 text-gray-400">
            Select a funding program to review its evaluation
            objectives, risk parameters and funded-stage rules.
          </p>
        </div>

        {/* PROGRAM TABS */}
        <div className="mx-auto mt-12 grid max-w-5xl grid-cols-2 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 lg:grid-cols-4">
          {programTabs.map((program) => {
            const active = selectedProgram === program.key;

            return (
              <button
                key={program.key}
                type="button"
                onClick={() =>
                  setSelectedProgram(program.key)
                }
                className={`px-4 py-5 font-bold transition sm:px-6 ${
                  active
                    ? "bg-green-500 text-black"
                    : "text-gray-300 hover:bg-zinc-900"
                }`}
              >
                <span>{program.name}</span>

                {program.popular && (
                  <span
                    className={`ml-2 hidden rounded-full px-2 py-1 text-[9px] font-black uppercase sm:inline-block ${
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

        {/* THREE STEP */}
        {selectedProgram === "THREE_STEP" && (
          <div className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-950 p-6 md:p-10">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-green-500">
                Three-Step Challenge
              </p>

              <h3 className="mt-3 text-3xl font-bold">
                Three Evaluation Phases
              </h3>

              <p className="mt-4 max-w-2xl leading-7 text-gray-400">
                Complete all three evaluation phases while
                respecting the trading objectives before
                progressing to the funded stage.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {/* PHASE 1 */}
              <RuleCard title="Phase 1">
                <Rule
                  label="Profit Target"
                  value={`${threeStepP1.profitTarget}%`}
                />

                <Rule
                  label="Daily Drawdown"
                  value={`${threeStepP1.dailyDrawdown}% ${formatRuleType(
                    threeStepP1.dailyDrawdownType
                  )}`}
                />

                <Rule
                  label="Maximum Drawdown"
                  value={`${threeStepP1.maxDrawdown}% ${formatRuleType(
                    threeStepP1.maxDrawdownType
                  )}`}
                />

                <Rule
                  label="Minimum Trading Days"
                  value={`${threeStepP1.minimumTradingDays} Days`}
                />
              </RuleCard>

              {/* PHASE 2 */}
              <RuleCard title="Phase 2">
                <Rule
                  label="Profit Target"
                  value={`${threeStepP2.profitTarget}%`}
                />

                <Rule
                  label="Daily Drawdown"
                  value={`${threeStepP2.dailyDrawdown}% ${formatRuleType(
                    threeStepP2.dailyDrawdownType
                  )}`}
                />

                <Rule
                  label="Maximum Drawdown"
                  value={`${threeStepP2.maxDrawdown}% ${formatRuleType(
                    threeStepP2.maxDrawdownType
                  )}`}
                />

                <Rule
                  label="Minimum Trading Days"
                  value={`${threeStepP2.minimumTradingDays} Days`}
                />
              </RuleCard>

              {/* PHASE 3 */}
              <RuleCard title="Phase 3">
                <Rule
                  label="Profit Target"
                  value={`${threeStepP3.profitTarget}%`}
                />

                <Rule
                  label="Daily Drawdown"
                  value={`${threeStepP3.dailyDrawdown}% ${formatRuleType(
                    threeStepP3.dailyDrawdownType
                  )}`}
                />

                <Rule
                  label="Maximum Drawdown"
                  value={`${threeStepP3.maxDrawdown}% ${formatRuleType(
                    threeStepP3.maxDrawdownType
                  )}`}
                />

                <Rule
                  label="Minimum Trading Days"
                  value={`${threeStepP3.minimumTradingDays} Days`}
                />
              </RuleCard>

              {/* FUNDED */}
              <RuleCard title="Funded Stage" funded>
                <Rule
                  label="Daily Drawdown"
                  value={`${threeStepFunded.dailyDrawdown}% ${formatRuleType(
                    threeStepFunded.dailyDrawdownType
                  )}`}
                />

                <Rule
                  label="Maximum Drawdown"
                  value={`${threeStepFunded.maxDrawdown}% ${formatRuleType(
                    threeStepFunded.maxDrawdownType
                  )}`}
                />

                <Rule
                  label="Minimum Trading Days"
                  value={`${threeStepFunded.minimumTradingDays} Days`}
                />

                <Rule
                  label="Consistency Rule"
                  value={
                    threeStepFunded.consistencyRule === null
                      ? "None"
                      : `${threeStepFunded.consistencyRule}%`
                  }
                />

                <Rule
                  label="Withdrawal"
                  value={`Every ${threeStepFunded.withdrawalDays} Days`}
                />
              </RuleCard>
            </div>
          </div>
        )}

        {/* TWO STEP */}
        {selectedProgram === "TWO_STEP" && (
          <div className="mt-10 rounded-3xl border border-green-500/30 bg-zinc-950 p-6 md:p-10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-green-500">
                  Two-Step Challenge
                </p>

                <h3 className="mt-3 text-3xl font-bold">
                  Two Evaluation Phases
                </h3>

                <p className="mt-4 max-w-2xl leading-7 text-gray-400">
                  Complete two evaluation phases before
                  progressing to your Mivo funded account.
                </p>
              </div>

              <span className="rounded-full bg-green-500/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-green-500">
                Most Popular
              </span>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {/* PHASE 1 */}
              <RuleCard title="Phase 1">
                <Rule
                  label="Profit Target"
                  value={`${twoStepP1.profitTarget}%`}
                />

                <Rule
                  label="Daily Drawdown"
                  value={`${twoStepP1.dailyDrawdown}% ${formatRuleType(
                    twoStepP1.dailyDrawdownType
                  )}`}
                />

                <Rule
                  label="Maximum Drawdown"
                  value={`${twoStepP1.maxDrawdown}% ${formatRuleType(
                    twoStepP1.maxDrawdownType
                  )}`}
                />

                <Rule
                  label="Minimum Trading Days"
                  value={`${twoStepP1.minimumTradingDays} Days`}
                />
              </RuleCard>

              {/* PHASE 2 */}
              <RuleCard title="Phase 2">
                <Rule
                  label="Profit Target"
                  value={`${twoStepP2.profitTarget}%`}
                />

                <Rule
                  label="Daily Drawdown"
                  value={`${twoStepP2.dailyDrawdown}% ${formatRuleType(
                    twoStepP2.dailyDrawdownType
                  )}`}
                />

                <Rule
                  label="Maximum Drawdown"
                  value={`${twoStepP2.maxDrawdown}% ${formatRuleType(
                    twoStepP2.maxDrawdownType
                  )}`}
                />

                <Rule
                  label="Minimum Trading Days"
                  value={`${twoStepP2.minimumTradingDays} Days`}
                />
              </RuleCard>

              {/* FUNDED */}
              <RuleCard title="Funded Stage" funded>
                <Rule
                  label="Daily Drawdown"
                  value={`${twoStepFunded.dailyDrawdown}% ${formatRuleType(
                    twoStepFunded.dailyDrawdownType
                  )}`}
                />

                <Rule
                  label="Maximum Drawdown"
                  value={`${twoStepFunded.maxDrawdown}% ${formatRuleType(
                    twoStepFunded.maxDrawdownType
                  )}`}
                />

                <Rule
                  label="Minimum Trading Days"
                  value={`${twoStepFunded.minimumTradingDays} Days`}
                />

                <Rule
                  label="Consistency Rule"
                  value={
                    twoStepFunded.consistencyRule === null
                      ? "None"
                      : `${twoStepFunded.consistencyRule}%`
                  }
                />

                <Rule
                  label="Withdrawal"
                  value={`Every ${twoStepFunded.withdrawalDays} Days`}
                />
              </RuleCard>
            </div>
          </div>
        )}

        {/* ONE STEP */}
        {selectedProgram === "ONE_STEP" && (
          <div className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-950 p-6 md:p-10">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-green-500">
                One-Step Challenge
              </p>

              <h3 className="mt-3 text-3xl font-bold">
                One Evaluation Phase
              </h3>

              <p className="mt-4 max-w-2xl leading-7 text-gray-400">
                Complete one evaluation phase and progress
                toward your Mivo funded account.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {/* EVALUATION */}
              <RuleCard title="Evaluation Phase">
                <Rule
                  label="Profit Target"
                  value={`${oneStep.profitTarget}%`}
                />

                <Rule
                  label="Daily Drawdown"
                  value={`${oneStep.dailyDrawdown}% ${formatRuleType(
                    oneStep.dailyDrawdownType
                  )}`}
                />

                <Rule
                  label="Maximum Drawdown"
                  value={`${oneStep.maxDrawdown}% ${formatRuleType(
                    oneStep.maxDrawdownType
                  )}`}
                />

                <Rule
                  label="Minimum Trading Days"
                  value={`${oneStep.minimumTradingDays} Days`}
                />

                <Rule
                  label="Consistency Rule"
                  value={`${oneStep.consistencyRule}%`}
                />
              </RuleCard>

              {/* FUNDED */}
              <RuleCard title="Funded Stage" funded>
                <Rule
                  label="Daily Drawdown"
                  value={`${oneStepFunded.dailyDrawdown}% ${formatRuleType(
                    oneStepFunded.dailyDrawdownType
                  )}`}
                />

                <Rule
                  label="Maximum Drawdown"
                  value={`${oneStepFunded.maxDrawdown}% ${formatRuleType(
                    oneStepFunded.maxDrawdownType
                  )}`}
                />

                <Rule
                  label="Minimum Trading Days"
                  value={`${oneStepFunded.minimumTradingDays} Days`}
                />

                <Rule
                  label="Consistency Rule"
                  value={`${oneStepFunded.consistencyRule}%`}
                />

                <Rule
                  label="Withdrawal"
                  value={`Every ${oneStepFunded.withdrawalDays} Days`}
                />
              </RuleCard>
            </div>
          </div>
        )}

        {/* INSTANT */}
        {selectedProgram === "INSTANT" && (
          <div className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-950 p-6 md:p-10">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-green-500">
                Instant Funding
              </p>

              <h3 className="mt-3 text-3xl font-bold">
                Start at the Funded Stage
              </h3>

              <p className="mt-4 max-w-2xl leading-7 text-gray-400">
                No evaluation phase. Start directly with a
                funded-stage account while following the
                applicable risk and consistency rules.
              </p>
            </div>

            <div className="mt-10 max-w-2xl">
              <RuleCard title="Funded Stage" funded>
                <Rule
                  label="Profit Target"
                  value="None"
                />

                <Rule
                  label="Daily Drawdown"
                  value={`${instant.dailyDrawdown}% ${formatRuleType(
                    instant.dailyDrawdownType
                  )}`}
                />

                <Rule
                  label="Maximum Drawdown"
                  value={`${instant.maxDrawdown}% ${formatRuleType(
                    instant.maxDrawdownType
                  )}`}
                />

                <Rule
                  label="Minimum Trading Days"
                  value={`${instant.minimumTradingDays} Days`}
                />

                <Rule
                  label="Consistency Rule"
                  value={`${instant.consistencyRule}%`}
                />

                <Rule
                  label="Withdrawal"
                  value={`Every ${instant.withdrawalDays} Days`}
                />
              </RuleCard>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-10 text-center">
          <Link
            href="/#funding-programs"
            className="inline-block rounded-xl bg-green-500 px-8 py-4 font-bold text-black transition hover:bg-green-400"
          >
            Choose Your Account
          </Link>
        </div>
      </div>
    </section>
  );
}

function RuleCard({
  title,
  children,
  funded = false,
}: {
  title: string;
  children: React.ReactNode;
  funded?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-6 ${
        funded
          ? "border-green-500/30 bg-green-500/[0.03]"
          : "border-zinc-800 bg-black"
      }`}
    >
      <div className="mb-6 flex items-center justify-between gap-3">
        <h4
          className={`text-lg font-bold ${
            funded ? "text-green-500" : "text-white"
          }`}
        >
          {title}
        </h4>

        {funded && (
          <span className="rounded-full bg-green-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-green-500">
            Funded
          </span>
        )}
      </div>

      <div className="space-y-4">{children}</div>
    </div>
  );
}