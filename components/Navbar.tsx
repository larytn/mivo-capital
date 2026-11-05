"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const links = [
  ["Community", "/community"],
  ["Trader Chat", "/chat"],
  ["Announcements", "/announcements"],
  ["Journal", "/journal"],
  ["Backtesting", "/backtesting"],
  ["MT5 Journal Sync", "/automation"],
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/profile", { cache: "no-store" })
      .then((response) => { if (active) setLoggedIn(response.ok); })
      .catch(() => { if (active) setLoggedIn(false); });
    return () => { active = false; };
  }, []);

  async function logout() {
    await fetch("/api/logout", { method: "POST" }).catch(() => undefined);
    setLoggedIn(false);
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 text-foreground backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-5 px-5 sm:px-8">
        <Link href="/" className="shrink-0 text-lg font-black tracking-wide">MIVO<span className="text-muted">. CAPITAL</span></Link>
        <nav className="hidden items-center gap-5 lg:flex">
          <Link href="/" className="text-sm text-muted hover:text-foreground">Home</Link>
          {links.map(([label, href]) => <Link key={href} href={href} className={`text-sm hover:text-foreground ${pathname === href ? "font-semibold text-foreground" : "text-muted"}`}>{label}</Link>)}
          {loggedIn ? <><Link href="/dashboard" className="text-sm font-semibold">Workspace</Link><button onClick={logout} className="text-sm text-muted hover:text-foreground">Log out</button></> : <><Link href="/login" className="text-sm text-muted">Sign in</Link><Link href="/signup" className="rounded-lg bg-foreground px-4 py-2 text-sm font-bold text-background">Join Mivo</Link></>}
        </nav>
        <button type="button" onClick={() => setMenuOpen((open) => !open)} aria-label="Toggle navigation" aria-expanded={menuOpen} className="rounded-lg border border-border px-3 py-2 lg:hidden">{menuOpen ? "Close" : "Menu"}</button>
      </div>
      {menuOpen && <nav className="grid gap-1 border-t border-border px-5 py-3 lg:hidden">{links.map(([label, href]) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface hover:text-foreground">{label}</Link>)}{loggedIn ? <><Link href="/dashboard" onClick={() => setMenuOpen(false)} className="px-3 py-2 text-sm">Workspace</Link><button onClick={logout} className="px-3 py-2 text-left text-sm">Log out</button></> : <><Link href="/login" onClick={() => setMenuOpen(false)} className="px-3 py-2 text-sm">Sign in</Link><Link href="/signup" onClick={() => setMenuOpen(false)} className="px-3 py-2 text-sm">Create account</Link></>}</nav>}
    </header>
  );
}
