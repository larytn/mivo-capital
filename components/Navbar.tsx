"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  const [loggedIn, setLoggedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch("/api/my-challenges", {
          credentials: "include",
        });

        setLoggedIn(response.status !== 401);
      } catch {
        setLoggedIn(false);
      }
    }

    checkAuth();
  }, []);

  // Close mobile menu whenever the route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  async function handleLogout() {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setLoggedIn(false);
      setMenuOpen(false);

      router.push("/login");
      router.refresh();
    }
  }

  function mobileLinkClass(path: string) {
    const active =
      pathname === path ||
      (path !== "/" && pathname.startsWith(`${path}/`));

    return `block rounded-xl px-4 py-3 text-sm font-semibold transition ${
      active
        ? "bg-green-500/10 text-green-500"
        : "text-gray-300 hover:bg-zinc-900 hover:text-white"
    }`;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-black/95 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-6">
        {/* LOGO */}
        <Link
          href="/"
          className="shrink-0 text-xl font-black tracking-tight text-green-500 sm:text-2xl"
        >
          Mivo Capital
        </Link>

        {/* DESKTOP NAV */}
        <nav className="hidden items-center gap-7 lg:flex">
          <Link
            href="/"
            className="text-sm font-medium text-white hover:text-green-500"
          >
            Home
          </Link>

          <Link
            href="/#funding-programs"
            className="text-sm font-medium text-gray-300 hover:text-green-500"
          >
            Funding Programs
          </Link>

          <Link
            href="/#trading-rules"
            className="text-sm font-medium text-gray-300 hover:text-green-500"
          >
            Trading Rules
          </Link>

          <Link
            href="/#how-it-works"
            className="text-sm font-medium text-gray-300 hover:text-green-500"
          >
            How It Works
          </Link>

          <Link
            href="/#faq"
            className="text-sm font-medium text-gray-300 hover:text-green-500"
          >
            FAQ
          </Link>

          {loggedIn ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-gray-300 hover:text-green-500"
              >
                Dashboard
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="text-sm font-medium text-red-400 hover:text-red-300"
              >
                Logout
              </button>

              <Link
                href="/challenges"
                className="rounded-xl bg-green-500 px-6 py-3 text-sm font-bold text-black transition hover:bg-green-400"
              >
                Buy Challenge
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/signup"
                className="text-sm font-medium text-gray-300 hover:text-green-500"
              >
                Sign Up
              </Link>

              <Link
                href="/login"
                className="text-sm font-medium text-gray-300 hover:text-green-500"
              >
                Login
              </Link>

              <Link
                href="/challenges"
                className="rounded-xl bg-green-500 px-6 py-3 text-sm font-bold text-black transition hover:bg-green-400"
              >
                Get Funded
              </Link>
            </>
          )}
        </nav>

        {/* MOBILE HAMBURGER */}
        <button
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-950 text-white transition hover:border-green-500 lg:hidden"
        >
          {menuOpen ? (
            <span className="text-2xl leading-none">×</span>
          ) : (
            <span className="text-2xl leading-none">☰</span>
          )}
        </button>
      </div>

      {/* MOBILE MENU */}
      {menuOpen && (
        <div className="border-t border-zinc-800 bg-black lg:hidden">
          <div className="mx-auto max-w-7xl px-5 py-5 sm:px-6">
            {loggedIn ? (
              <>
                {/* TRADER MENU */}
                <p className="mb-3 px-4 text-xs font-bold uppercase tracking-[0.18em] text-green-500">
                  Trader Menu
                </p>

                <div className="space-y-1">
                  <Link
                    href="/dashboard"
                    className={mobileLinkClass("/dashboard")}
                  >
                    Dashboard
                  </Link>

                  <Link
                    href="/accounts"
                    className={mobileLinkClass("/accounts")}
                  >
                    Accounts
                  </Link>

                  <Link
                    href="/transactions"
                    className={mobileLinkClass("/transactions")}
                  >
                    Transactions
                  </Link>

                  <Link
                    href="/withdrawals"
                    className={mobileLinkClass("/withdrawals")}
                  >
                    Withdrawals
                  </Link>

                  <Link
                    href="/profile"
                    className={mobileLinkClass("/profile")}
                  >
                    Profile
                  </Link>

                  <Link
                    href="/referrals"
                    className={mobileLinkClass("/referrals")}
                  >
                    Referrals
                  </Link>

                  <Link
                    href="/support"
                    className={mobileLinkClass("/support")}
                  >
                    Support
                  </Link>
                </div>

                <div className="my-5 border-t border-zinc-800" />

                <Link
                  href="/challenges"
                  className="block rounded-xl bg-green-500 px-5 py-4 text-center font-bold text-black transition hover:bg-green-400"
                >
                  Buy Challenge
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-3 w-full rounded-xl border border-red-500/30 px-5 py-4 text-center font-semibold text-red-400 transition hover:bg-red-500/10"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                {/* PUBLIC MENU */}
                <div className="space-y-1">
                  <Link
                    href="/"
                    className={mobileLinkClass("/")}
                  >
                    Home
                  </Link>

                  <Link
                    href="/#funding-programs"
                    className="block rounded-xl px-4 py-3 text-sm font-semibold text-gray-300 transition hover:bg-zinc-900 hover:text-white"
                  >
                    Funding Programs
                  </Link>

                  <Link
                    href="/#trading-rules"
                    className="block rounded-xl px-4 py-3 text-sm font-semibold text-gray-300 transition hover:bg-zinc-900 hover:text-white"
                  >
                    Trading Rules
                  </Link>

                  <Link
                    href="/#how-it-works"
                    className="block rounded-xl px-4 py-3 text-sm font-semibold text-gray-300 transition hover:bg-zinc-900 hover:text-white"
                  >
                    How It Works
                  </Link>

                  <Link
                    href="/#faq"
                    className="block rounded-xl px-4 py-3 text-sm font-semibold text-gray-300 transition hover:bg-zinc-900 hover:text-white"
                  >
                    FAQ
                  </Link>
                </div>

                <div className="my-5 border-t border-zinc-800" />

                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href="/login"
                    className="rounded-xl border border-zinc-700 px-4 py-3 text-center text-sm font-bold text-white"
                  >
                    Login
                  </Link>

                  <Link
                    href="/signup"
                    className="rounded-xl border border-zinc-700 px-4 py-3 text-center text-sm font-bold text-white"
                  >
                    Sign Up
                  </Link>
                </div>

                <Link
                  href="/challenges"
                  className="mt-3 block rounded-xl bg-green-500 px-5 py-4 text-center font-bold text-black transition hover:bg-green-400"
                >
                  Get Funded
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}