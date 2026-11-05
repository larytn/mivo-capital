"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ThemeToggle } from "./theme-provider";

type NavItem = { label: string; href: string; icon: string };
type NavSection = { label: string; items: NavItem[] };

const sections: NavSection[] = [
  { label: "Trading desk", items: [
    { label: "Overview", href: "/dashboard", icon: "M" },
    { label: "Backtesting lab", href: "/backtesting", icon: "B" },
    { label: "Trade journal", href: "/journal", icon: "J" },
    { label: "MT5 journal sync", href: "/automation", icon: "S" },
  ] },
  { label: "Community", items: [
    { label: "Feed & discussions", href: "/community", icon: "C" },
    { label: "Trader chat", href: "/chat", icon: "T" },
    { label: "VIP Signals", href: "/signals", icon: "V" },
    { label: "Announcements", href: "/announcements", icon: "N" },
  ] },
];
const pageTitles = new Map([
  ["/dashboard", "Overview"],
  ["/community", "Feed & discussions"], ["/chat", "Trader chat"], ["/journal", "Trade journal"],
  ["/backtesting", "Backtesting lab"], ["/automation", "MT5 journal sync"], ["/announcements", "Announcements"],
  ["/signals", "VIP Signals"],
  ["/profile", "Profile"], ["/settings", "Settings"], ["/support", "Support"], ["/referrals", "Referrals"],
]);

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const excluded = ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/verify-email"];
  if (excluded.includes(pathname) || pathname.startsWith("/admin")) return children;
  const title = pageTitles.get(pathname) ?? "Workspace";
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  async function logout() {
    try { await fetch("/api/logout", { method: "POST" }); }
    finally { window.location.href = "/login"; }
  }

  return <div className="workspace-shell">
    <button type="button" aria-label="Close navigation" onClick={() => setMenuOpen(false)} className={`workspace-scrim ${menuOpen ? "is-open" : ""}`} />
    <aside className={`workspace-sidebar ${menuOpen ? "is-open" : ""}`}>
      <Link href="/dashboard" className="workspace-brand" onClick={() => setMenuOpen(false)}>
        <span className="workspace-brand-mark">M</span><span><span className="workspace-brand-title block">MIVO CAPITAL</span><span className="workspace-brand-subtitle block">TRADING ECOSYSTEM</span></span>
      </Link>
      <nav className="workspace-nav" aria-label="Workspace navigation">
        {sections.map((section) => <div key={section.label}><p className="workspace-nav-label">{section.label}</p>{section.items.map((item) => <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} aria-current={isActive(item.href) ? "page" : undefined} className={`workspace-nav-link ${isActive(item.href) ? "is-active" : ""}`}><span className="workspace-nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span></Link>)}</div>)}
        <p className="workspace-nav-label">Your account</p>
        {[{ label: "Profile", href: "/profile" }, { label: "Settings", href: "/settings" }, { label: "Support", href: "/support" }].map((item) => <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} aria-current={isActive(item.href) ? "page" : undefined} className="workspace-nav-link"><span className="workspace-nav-icon" aria-hidden="true">{item.label[0]}</span><span>{item.label}</span></Link>)}
      </nav>
      <div className="workspace-sidebar-footer"><div className="workspace-member"><span className="workspace-member-avatar">M</span><span className="min-w-0"><span className="workspace-member-name block">Mivo member</span><span className="workspace-member-caption block">Your trading workspace</span></span></div><button type="button" onClick={logout} className="workspace-signout">Sign out</button></div>
    </aside>
    <div className="workspace-content">
      <header className="workspace-topbar"><div className="workspace-topbar-left"><button type="button" aria-label="Open navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)} className="workspace-mobile-menu">{"\u2630"}</button><p className="workspace-crumb">Workspace <span className="mx-2">/</span><strong>{title}</strong></p></div><div className="workspace-topbar-actions"><ThemeToggle /><Link href="/profile" aria-label="Open profile" className="workspace-profile-link">M</Link></div></header>
      {children}
    </div>
  </div>;
}
