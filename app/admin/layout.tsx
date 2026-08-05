"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const menuItems = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: "📊",
  },
  {
    href: "/admin/challenges",
    label: "Challenges",
    icon: "📈",
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: "👥",
  },
  {
    href: "/admin/payments",
    label: "Payments",
    icon: "💳",
  },
  {
    href: "/admin/withdrawals",
    label: "Withdrawals",
    icon: "💰",
  },
  {
    href: "/admin/kyc",
    label: "KYC Verification",
    icon: "🪪",
  },
  {
    href: "/admin/support",
    label: "Support",
    icon: "🎧",
  },
  {
    href: "/admin/promos",
    label: "Promo Codes",
    icon: "🏷️",
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  async function handleLogout() {
    try {
      setLoggingOut(true);

      const response = await fetch("/api/logout", {
        method: "POST",
      });

      if (!response.ok) {
        alert("Failed to logout.");
        return;
      }

      router.push("/admin/login");
      router.refresh();
    } catch (error) {
      console.error("Admin logout error:", error);
      alert("Failed to logout.");
    } finally {
      setLoggingOut(false);
    }
  }

  function isActive(href: string) {
    if (href === "/admin") {
      return pathname === "/admin";
    }

    return pathname.startsWith(href);
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* MOBILE HEADER */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 lg:hidden">
        <Link
          href="/admin"
          className="text-xl font-black text-green-500"
        >
          Mivo Admin
        </Link>

        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open admin menu"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-700 text-2xl"
        >
          ☰
        </button>
      </header>

      {/* MOBILE OVERLAY */}
      {menuOpen && (
        <button
          type="button"
          aria-label="Close admin menu"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-[60] bg-black/70 lg:hidden"
        />
      )}

      {/* MOBILE SIDEBAR */}
      <aside
        className={`fixed bottom-0 left-0 top-0 z-[70] flex w-[85%] max-w-[320px] flex-col border-r border-zinc-800 bg-zinc-950 transition-transform duration-300 lg:hidden ${
          menuOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 p-5">
          <div>
            <h1 className="text-2xl font-black text-green-500">
              Mivo Admin
            </h1>

            <p className="mt-1 text-xs text-gray-500">
              Control Center
            </p>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-700 text-xl"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold transition ${
                isActive(item.href)
                  ? "bg-green-500 text-black"
                  : "text-gray-300 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="space-y-3 border-t border-zinc-800 p-4">
          <Link
            href="/dashboard"
            className="block rounded-xl border border-zinc-700 px-4 py-3 text-center text-sm font-bold"
          >
            Trader Dashboard
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full rounded-xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-400 disabled:opacity-50"
          >
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </aside>

      {/* DESKTOP SIDEBAR */}
      <aside className="fixed bottom-0 left-0 top-0 hidden w-72 flex-col border-r border-zinc-800 bg-zinc-950 lg:flex">
        <div className="border-b border-zinc-800 p-6">
          <h1 className="text-3xl font-black text-green-500">
            Mivo Admin
          </h1>

          <p className="mt-2 text-sm text-gray-400">
            Control Center
          </p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-5">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition ${
                isActive(item.href)
                  ? "bg-green-500 font-bold text-black"
                  : "text-gray-300 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="space-y-3 border-t border-zinc-800 p-5">
          <Link
            href="/dashboard"
            className="block rounded-xl border border-zinc-700 px-4 py-3 text-center text-sm font-bold transition hover:border-green-500 hover:text-green-400"
          >
            Trader Dashboard
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full rounded-xl bg-red-500/10 px-4 py-3 font-bold text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
          >
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </aside>

      {/* PAGE CONTENT */}
      <main className="min-w-0 overflow-x-hidden px-4 py-6 sm:px-6 lg:ml-72 lg:p-8">
        {children}
      </main>
    </div>
  );
}