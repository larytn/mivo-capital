import Link from "next/link";
import Navbar from "../components/Navbar";
import FundingPrograms from "./components/FundingPrograms";
import TradingRules from "./components/TradingRules";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      {/* HERO */}
      <section
        id="home"
        className="relative scroll-mt-36 overflow-hidden border-b border-zinc-900"
      >
        <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-green-500/10 blur-[140px]" />

        <div className="relative mx-auto flex min-h-[720px] max-w-7xl flex-col items-center justify-center px-6 py-24 text-center">
          <div className="rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm font-semibold text-green-400">
            Built for serious traders
          </div>

          <h1 className="mt-8 max-w-5xl text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
            Prove Your Edge.
            <br />
            <span className="text-green-500">
              Trade Mivo Capital.
            </span>
          </h1>

          <p className="mt-7 max-w-2xl text-base leading-7 text-gray-400 sm:text-lg md:text-xl">
            Choose your funding program, demonstrate disciplined trading,
            and progress toward managing a Mivo funded account.
          </p>

          <div className="mt-10 flex w-full max-w-md flex-col gap-4 sm:w-auto sm:max-w-none sm:flex-row">
            <Link
              href="/#funding-programs"
              className="rounded-xl bg-green-500 px-9 py-4 text-center font-bold text-black transition hover:bg-green-400"
            >
              Get Funded
            </Link>

            <Link
              href="/login"
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-9 py-4 text-center font-bold transition hover:border-zinc-500 hover:bg-zinc-900"
            >
              Trader Login
            </Link>
          </div>

          {/* HERO FEATURES */}
          <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-gray-400">
            <span className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Clear Trading Rules
            </span>

            <span className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Multiple Funding Programs
            </span>

            <span className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Performance Dashboard
            </span>
          </div>
        </div>
      </section>

      {/* FUNDING PROGRAMS */}
      <FundingPrograms />

      {/* TRADING RULES */}
      <TradingRules />

      {/* HOW IT WORKS */}
      <section
        id="how-it-works"
        className="scroll-mt-36 border-t border-zinc-900 bg-zinc-950 py-24"
      >
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-500">
              How It Works
            </p>

            <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
              Your Path to Mivo Funding
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-gray-400">
              Choose your account, demonstrate your trading ability, and
              progress toward managing funded capital.
            </p>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                number: "01",
                title: "Choose a Program",
                description:
                  "Select Three-Step, Two-Step, One-Step or Instant Funding and choose your account size.",
              },
              {
                number: "02",
                title: "Start Trading",
                description:
                  "Receive your trading account and trade within the rules of your selected program.",
              },
              {
                number: "03",
                title: "Meet the Objectives",
                description:
                  "Reach the required trading objectives while respecting all risk parameters.",
              },
              {
                number: "04",
                title: "Get Funded",
                description:
                  "Complete your evaluation and progress to a Mivo funded account.",
              },
            ].map((step) => (
              <div
                key={step.number}
                className="relative rounded-2xl border border-zinc-800 bg-black p-7"
              >
                <span className="text-5xl font-black text-green-500/20">
                  {step.number}
                </span>

                <h3 className="mt-5 text-xl font-bold">
                  {step.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-gray-400">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY MIVO */}
      <section className="bg-black py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-500">
                Why Mivo Capital
              </p>

              <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
                Built Around the Trader
              </h2>

              <p className="mt-6 max-w-xl leading-7 text-gray-400">
                Mivo Capital gives traders a clear path to funding with
                transparent rules, multiple account options and detailed
                performance tracking.
              </p>

              <Link
                href="/#funding-programs"
                className="mt-8 inline-block rounded-xl bg-green-500 px-7 py-4 font-bold text-black transition hover:bg-green-400"
              >
                Get Funded
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  title: "Flexible Programs",
                  description:
                    "Choose between Three-Step, Two-Step, One-Step and Instant Funding programs.",
                },
                {
                  title: "Clear Risk Rules",
                  description:
                    "Know your profit targets and drawdown limits before placing your first trade.",
                },
                {
                  title: "Performance Analytics",
                  description:
                    "Track balance, equity, profit, drawdown and trading activity from your dashboard.",
                },
                {
                  title: "Automated Trade Journal",
                  description:
                    "Your trading activity is recorded automatically so you can review your performance.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
                >
                  <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 font-bold text-green-500">
                    ✓
                  </div>

                  <h3 className="text-lg font-bold">
                    {item.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-gray-400">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section
        id="faq"
        className="scroll-mt-36 border-t border-zinc-900 bg-zinc-950 py-24"
      >
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-500">
              FAQ
            </p>

            <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
              Frequently Asked Questions
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-gray-400">
              Everything you need to know before starting with Mivo Capital.
            </p>
          </div>

          <div className="mt-14 space-y-4">
            {[
              {
                question:
                  "What funding programs does Mivo Capital offer?",
                answer:
                  "Mivo Capital offers Three-Step, Two-Step, One-Step and Instant Funding programs with multiple account sizes.",
              },
              {
                question:
                  "What happens after I purchase an account?",
                answer:
                  "Your trading account is created and connected to your Mivo dashboard, where you can monitor your account details, rules and trading performance.",
              },
              {
                question:
                  "How are my trading results tracked?",
                answer:
                  "Trading activity is synchronized with your Mivo account so your balance, equity, profit, drawdown and trade history can be tracked automatically.",
              },
              {
                question:
                  "What happens if I breach a trading rule?",
                answer:
                  "Your account is automatically evaluated against the rules of your selected program. If a drawdown limit is breached, the account will be marked as failed.",
              },
              {
                question:
                  "Can I have more than one Mivo account?",
                answer:
                  "Yes. Traders can purchase and manage multiple trading accounts from the same Mivo dashboard.",
              },
            ].map((item) => (
              <details
                key={item.question}
                className="group rounded-2xl border border-zinc-800 bg-black"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 p-6 font-bold">
                  {item.question}

                  <span className="text-2xl text-green-500 transition group-open:rotate-45">
                    +
                  </span>
                </summary>

                <div className="border-t border-zinc-800 px-6 py-5 text-sm leading-7 text-gray-400">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-black py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="relative overflow-hidden rounded-3xl border border-green-500/20 bg-zinc-950 px-6 py-16 text-center md:px-12 md:py-20">
            <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-96 -translate-x-1/2 rounded-full bg-green-500/10 blur-[100px]" />

            <div className="relative">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-500">
                Ready to Start?
              </p>

              <h2 className="mx-auto mt-4 max-w-3xl text-4xl font-black tracking-tight md:text-5xl">
                Your Next Trading Account Starts Here.
              </h2>

              <p className="mx-auto mt-5 max-w-2xl leading-7 text-gray-400">
                Choose your Mivo Capital funding program and start working
                toward your funded account.
              </p>

              <Link
                href="/#funding-programs"
                className="mt-8 inline-block rounded-xl bg-green-500 px-9 py-4 font-bold text-black transition hover:bg-green-400"
              >
                Get Funded
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-zinc-900 bg-zinc-950">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <div className="grid gap-10 md:grid-cols-4">
            <div className="md:col-span-2">
              <Link
                href="/"
                className="text-2xl font-black text-green-500"
              >
                MIVO CAPITAL
              </Link>

              <p className="mt-4 max-w-md text-sm leading-6 text-gray-500">
                Trading evaluation and funding programs built for disciplined
                traders.
              </p>
            </div>

            <div>
              <h3 className="font-bold">Company</h3>

              <div className="mt-4 flex flex-col gap-3 text-sm text-gray-500">
                <Link
                  href="/#funding-programs"
                  className="hover:text-white"
                >
                  Funding Programs
                </Link>

                <Link
                  href="/#trading-rules"
                  className="hover:text-white"
                >
                  Trading Rules
                </Link>

                <Link
                  href="/#how-it-works"
                  className="hover:text-white"
                >
                  How It Works
                </Link>

                <Link
                  href="/#faq"
                  className="hover:text-white"
                >
                  FAQ
                </Link>
              </div>
            </div>

            <div>
              <h3 className="font-bold">Trader</h3>

              <div className="mt-4 flex flex-col gap-3 text-sm text-gray-500">
                <Link
                  href="/login"
                  className="hover:text-white"
                >
                  Trader Login
                </Link>

                <Link
                  href="/signup"
                  className="hover:text-white"
                >
                  Create Account
                </Link>

                <Link
                  href="/dashboard"
                  className="hover:text-white"
                >
                  Dashboard
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-12 border-t border-zinc-800 pt-8">
            <p className="max-w-5xl text-xs leading-6 text-gray-600">
              Trading involves significant risk. Mivo Capital services are
              intended for traders who understand the risks associated with
              financial markets. Past performance does not guarantee future
              results.
            </p>

            <div className="mt-6 flex flex-col gap-4 text-xs text-gray-600 sm:flex-row sm:items-center sm:justify-between">
              <p>
                © {new Date().getFullYear()} Mivo Capital. All rights reserved.
              </p>

              <div className="flex gap-5">
                <Link
                  href="/terms"
                  className="hover:text-gray-300"
                >
                  Terms
                </Link>

                <Link
                  href="/privacy"
                  className="hover:text-gray-300"
                >
                  Privacy
                </Link>

                <Link
                  href="/risk-disclosure"
                  className="hover:text-gray-300"
                >
                  Risk Disclosure
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}