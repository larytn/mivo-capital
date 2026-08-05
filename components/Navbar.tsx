"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);

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

  async function handleLogout() {
    await fetch("/api/logout", {
      method: "POST",
      credentials: "include",
    });

    setLoggedIn(false);
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-black/95 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <Link
          href="/"
          className="shrink-0 text-2xl font-black tracking-tight text-green-500"
        >
          Mivo Capital
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          <Link href="/" className="text-sm font-medium text-white hover:text-green-500">
            Home
          </Link>

          <Link href="/#funding-programs" className="text-sm font-medium text-gray-300 hover:text-green-500">
            Funding Programs
          </Link>

          <Link href="/#trading-rules" className="text-sm font-medium text-gray-300 hover:text-green-500">
            Trading Rules
          </Link>

          <Link href="/#how-it-works" className="text-sm font-medium text-gray-300 hover:text-green-500">
            How It Works
          </Link>

          <Link href="/#faq" className="text-sm font-medium text-gray-300 hover:text-green-500">
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
                className="rounded-xl bg-green-500 px-6 py-3 text-sm font-bold text-black hover:bg-green-400"
              >
                Buy Challenge
              </Link>
            </>
          ) : (
            <>
              <Link href="/signup" className="text-sm font-medium text-gray-300 hover:text-green-500">
                Sign Up
              </Link>

              <Link href="/login" className="text-sm font-medium text-gray-300 hover:text-green-500">
                Login
              </Link>

              <Link
                href="/challenges"
                className="rounded-xl bg-green-500 px-6 py-3 text-sm font-bold text-black hover:bg-green-400"
              >
                Get Funded
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-3 lg:hidden">
          {loggedIn ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm font-semibold text-white"
              >
                Dashboard
              </Link>

              <Link
                href="/challenges"
                className="rounded-lg bg-green-500 px-4 py-2 text-sm font-bold text-black"
              >
                Buy Challenge
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-semibold text-white">
                Login
              </Link>

              <Link
                href="/challenges"
                className="rounded-lg bg-green-500 px-4 py-2 text-sm font-bold text-black"
              >
                Get Funded
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}