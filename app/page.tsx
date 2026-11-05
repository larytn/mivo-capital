import Link from "next/link";

const modules = [
  { number: "01", icon: "C", name: "Community", description: "Share market ideas, discuss setups, and learn alongside other traders.", href: "/community", label: "Explore community", tag: "SOCIAL" },
  { number: "02", icon: "T", name: "Trader Chat", description: "Connect with members in the shared market conversation room.", href: "/chat", label: "Join the conversation", tag: "COMMUNITY" },
  { number: "03", icon: "J", name: "Trade Journal", description: "Record manual trades, review executions, and understand your performance.", href: "/journal", label: "Open journal", tag: "ANALYTICS" },
  { number: "04", icon: "B", name: "Backtesting Lab", description: "Replay historical price action and evaluate your trading strategy.", href: "/backtesting", label: "Enter the lab", tag: "RESEARCH" },
  { number: "05", icon: "MT5", name: "MT5 Journal Sync", description: "Connect your MetaTrader 5 account and bring trades into your journal.", href: "/automation", label: "Connect MT5", tag: "JOURNALING" },
];

const principles = [
  {
    number: "01",
    title: "Build a repeatable process",
    description:
      "Use historical testing, a clear journal, and trader discussion to improve your decisions.",
  },
  {
    number: "02",
    title: "Test before trusting",
    description:
      "Use historical price action to evaluate your ideas instead of relying on assumptions.",
  },
  {
    number: "03",
    title: "Track your decisions",
    description:
      "Keep your trading records organized and use evidence to identify areas for improvement.",
  },
];

export default function Home() {
  return (
    <main className="mivo-home min-h-screen overflow-hidden bg-background text-white">
      {/* NAVIGATION */}
      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-5 px-5 sm:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-lg font-black text-accent">
              M
            </span>
            <span>
              <span className="block text-sm font-black tracking-[0.16em]">
                MIVO CAPITAL
              </span>
              <span className="mt-1 block text-[9px] tracking-[0.22em] text-zinc-500">
                THE TRADING ECOSYSTEM
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-zinc-400 lg:flex">
            <Link href="#ecosystem" className="transition hover:text-white">
              Ecosystem
            </Link>
            <Link href="/community" className="transition hover:text-white">
              Community
            </Link>
            <Link href="/backtesting" className="transition hover:text-white">
              Backtesting
            </Link>
            <Link href="/journal" className="transition hover:text-white">
              Trade Journal
            </Link>
          </nav>

          <div className="flex shrink-0 items-center gap-3">
            <Link
              href="/login"
              className="hidden rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:text-white sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground transition hover:bg-accent/90"
            >
              Get started <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative border-b border-white/[0.07]">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[850px] -translate-x-1/2 rounded-full bg-accent/[0.09] blur-[150px]" />
        <div className="pointer-events-none absolute right-[7%] top-24 h-80 w-80 rounded-full bg-[#ffbd69]/[0.08] blur-[130px]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_90%)]" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-5 py-24 sm:px-8 sm:py-32 lg:grid-cols-[1.1fr_0.9fr] lg:py-36">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/[0.07] px-3.5 py-2 text-xs font-semibold tracking-wide text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              ONE ECOSYSTEM. MORE POSSIBILITIES.
            </div>

            <h1 className="mt-8 max-w-3xl text-5xl font-semibold leading-[1.08] tracking-[-0.055em] sm:text-6xl md:text-7xl">
              Everything your
              <br />
              trading journey
              <br />
              <span className="text-accent">needs to grow.</span>
            </h1>

            <p className="mt-7 max-w-xl text-base leading-8 text-zinc-400 sm:text-lg">
              Backtest your ideas, keep a clear trade journal, connect MT5, and
              share market conversations with other traders.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-3 rounded-xl bg-accent px-6 py-4 font-bold text-accent-foreground transition hover:bg-accent/90"
              >
                Join the ecosystem <span aria-hidden="true">↗</span>
              </Link>
              <Link
                href="#ecosystem"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-6 py-4 font-semibold text-zinc-200 transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                Explore the platform
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-xs text-zinc-500">
              <span className="flex items-center gap-2">
                <span className="text-accent">✓</span> Trading tools
              </span>
              <span className="flex items-center gap-2">
                <span className="text-accent">✓</span> Trader community
              </span>
              <span className="flex items-center gap-2">
                <span className="text-accent">✓</span> MT5 journal sync
              </span>
            </div>
          </div>

          {/* ECOSYSTEM PREVIEW */}
          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-5 rounded-[32px] bg-accent/[0.06] blur-2xl" />
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d1210] shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
                <div>
                  <p className="text-sm font-bold">Your trading workspace</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    One home for your trading workflow
                  </p>
                </div>
                <span className="rounded-md border border-accent/20 bg-accent/[0.08] px-2.5 py-1.5 text-[10px] font-semibold tracking-wide text-accent">
                  MIVO
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 sm:p-5">
                {[
                  {
                    icon: "M",
                    title: "Community",
                    detail: "Ideas & discussions",
                  },
                  {
                    icon: "M",
                    title: "Trade journal",
                    detail: "Records & analytics",
                  },
                  {
                    icon: "M",
                    title: "Backtesting",
                    detail: "Replay & research",
                  },
                  {
                    icon: "M",
                    title: "Trader chat",
                    detail: "Shared conversations",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4 transition hover:border-accent/30"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-lg text-accent">
                      {item.icon}
                    </span>
                    <p className="mt-4 text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mx-4 mb-4 rounded-xl border border-white/[0.08] bg-black/20 p-4 sm:mx-5 sm:mb-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-zinc-300">
                      Built around your process
                    </p>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      Learn. Test. Record. Improve.
                    </p>
                  </div>
                  <span className="text-xl text-accent">↗</span>
                </div>
                <div className="mt-4 flex h-12 items-end gap-1.5">
                  {[25, 34, 29, 45, 39, 54, 44, 61, 49, 70, 59, 84, 73, 96, 82, 100].map(
                    (height, index) => (
                      <div
                        key={index}
                        className="flex-1 rounded-t-sm bg-accent/70"
                        style={{ height: `${height}%` }}
                      />
                    ),
                  )}
                </div>
                <p className="mt-2 text-[10px] text-zinc-600">
                  Illustrative visual · Not live market data
                </p>
              </div>
            </div>
            <div className="pointer-events-none absolute -bottom-5 -right-3 hidden rounded-xl border border-white/10 bg-[#111714] px-4 py-3 shadow-xl sm:block">
              <p className="text-xs font-semibold text-white">
                More than a trading platform
              </p>
              <p className="mt-1 text-[10px] text-zinc-500">
                A foundation for your journey
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ECOSYSTEM MODULES */}
      <section id="ecosystem" className="scroll-mt-24 py-24 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-bold tracking-[0.22em] text-accent">
                THE ECOSYSTEM
              </p>
              <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">
                Your trading world,
                <br className="hidden sm:block" /> connected.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-zinc-400 sm:text-base">
              Different tools. One account. A connected experience that can
              grow with you as your needs change.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {modules.map((module) => (
              <article
                key={module.number}
                className="group flex min-h-[285px] flex-col rounded-2xl border border-white/[0.09] bg-surface p-6 transition duration-300 hover:-translate-y-1 hover:border-accent/30 hover:bg-surface-raised sm:p-7"
              >
                <div className="flex items-start justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-accent/15 bg-accent/[0.07] text-xl text-accent">
                    {module.icon}
                  </span>
                  <span className="text-[10px] font-semibold tracking-[0.15em] text-zinc-600">
                    {module.tag}
                  </span>
                </div>

                <h3 className="mt-6 text-xl font-semibold">{module.name}</h3>
                <p className="mt-3 text-sm leading-7 text-zinc-400">
                  {module.description}
                </p>

                <div className="mt-auto pt-6">
                  <Link
                    href={module.href}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-accent transition group-hover:text-accent"
                  >
                    {module.label} <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <p className="font-semibold">Announcements & platform updates</p>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Keep up with news, new features and updates from Mivo Capital.
              </p>
            </div>
            <Link
              href="/announcements"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-white/10 px-5 py-3 text-sm font-semibold transition hover:border-accent/30 hover:text-accent"
            >
              View announcements <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* WORKFLOW */}
      <section className="border-y border-white/[0.07] bg-[#0b0f0d] py-24 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold tracking-[0.22em] text-accent">
              THE PROCESS
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
              Build a process.
              <br />
              Not just a trading habit.
            </h2>
            <p className="mt-5 text-sm leading-7 text-zinc-400 sm:text-base">
              Trading development takes more than finding entries. Mivo is
              being designed to help bring learning, research and reflection
              into one repeatable workflow.
            </p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-3 md:gap-10">
            {principles.map((item) => (
              <div key={item.number} className="border-t border-white/10 pt-6">
                <p className="text-sm font-bold text-accent">
                  {item.number}
                </p>
                <h3 className="mt-5 text-xl font-semibold">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-zinc-400">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 py-24 sm:px-8 sm:py-28">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl border border-accent/20 bg-surface px-6 py-16 text-center sm:px-12 sm:py-20">
          <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[500px] -translate-x-1/2 rounded-full bg-accent/[0.09] blur-[100px]" />
          <div className="relative">
            <p className="text-xs font-bold tracking-[0.22em] text-accent">
              YOUR NEXT CHAPTER
            </p>
            <h2 className="mx-auto mt-5 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">
              Make every part of your trading journey count.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-zinc-400 sm:text-base">
              Create your Mivo account and get ready for a more connected way
              to learn, research and manage your trading.
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-flex items-center justify-center gap-3 rounded-xl bg-accent px-7 py-4 font-bold text-accent-foreground transition hover:bg-accent/90"
            >
              Create your account <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.08] bg-[#060807]">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <Link href="/" className="text-lg font-black tracking-[0.16em]">
                MIVO <span className="text-accent">CAPITAL</span>
              </Link>
              <p className="mt-4 max-w-sm text-sm leading-7 text-zinc-500">
                A growing ecosystem for trading education, research, journaling,
                community and new opportunities.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold">Explore</h3>
              <div className="mt-4 flex flex-col gap-3 text-sm text-zinc-500">
                <Link href="/community" className="transition hover:text-white">
                  Community
                </Link>
                <Link href="/chat" className="transition hover:text-white">
                  Trader Chat
                </Link>
                <Link href="/journal" className="transition hover:text-white">
                  Trade Journal
                </Link>
                <Link href="/backtesting" className="transition hover:text-white">
                  Backtesting Lab
                </Link>
                <Link href="/automation" className="transition hover:text-white">
                  MT5 Journal Sync
                </Link>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold">Your account</h3>
              <div className="mt-4 flex flex-col gap-3 text-sm text-zinc-500">
                <Link href="/login" className="transition hover:text-white">
                  Sign in
                </Link>
                <Link href="/signup" className="transition hover:text-white">
                  Create account
                </Link>
                <Link href="/announcements" className="transition hover:text-white">
                  Announcements
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-white/[0.08] pt-6 text-xs leading-6 text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Mivo Capital. All rights reserved.</p>
            <p>
              Trading involves risk. Educational tools and historical testing do
              not guarantee future results.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
