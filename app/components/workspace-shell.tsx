"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ThemeToggle } from "./theme-provider";
import { BrandLogo } from "./brand-logo";
import { MivoMark } from "./mivo-mark";

type NavIconName = "overview" | "backtest" | "journal" | "sync" | "community" | "chat" | "signals" | "announcements" | "profile" | "settings" | "support";
type NavItem = { label: string; href: string; icon: NavIconName };
type NavSection = { label: string; items: NavItem[] };

const sections: NavSection[] = [
  { label: "Trading desk", items: [
    { label: "Overview", href: "/dashboard", icon: "overview" },
    { label: "Backtesting lab", href: "/backtesting", icon: "backtest" },
    { label: "Trade journal", href: "/journal", icon: "journal" },
    { label: "MT5 journal sync", href: "/automation", icon: "sync" },
  ] },
  { label: "Community", items: [
    { label: "Feed & discussions", href: "/community", icon: "community" },
    { label: "Trader chat", href: "/chat", icon: "chat" },
    { label: "VIP Signals", href: "/signals", icon: "signals" },
    { label: "Announcements", href: "/announcements", icon: "announcements" },
  ] },
];
const pageTitles = new Map([
  ["/dashboard", "Overview"],
  ["/community", "Feed & discussions"], ["/chat", "Trader chat"], ["/journal", "Trade journal"],
  ["/backtesting", "Backtesting lab"], ["/automation", "MT5 journal sync"], ["/announcements", "Announcements"],
  ["/signals", "VIP Signals"],
  ["/profile", "Profile"], ["/settings", "Settings"], ["/support", "Support"], ["/referrals", "Referrals"],
]);

function WorkspaceIcon({ name }: { name: NavIconName }) {
  const paths: Record<NavIconName, ReactNode> = {
    overview: <><rect x="3.5" y="3.5" width="7" height="7" rx="1" /><rect x="13.5" y="3.5" width="7" height="7" rx="1" /><rect x="3.5" y="13.5" width="7" height="7" rx="1" /><rect x="13.5" y="13.5" width="7" height="7" rx="1" /></>,
    backtest: <><path d="M4 19V5M4 19h16" /><path d="m7 15 4-4 3 2 5-6" /></>,
    journal: <><rect x="5" y="3.5" width="14" height="17" rx="2" /><path d="M8.5 8h7M8.5 12h7M8.5 16h4" /></>,
    sync: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.5 9a7 7 0 0 1 11.8-2L20 7M4 17l2.7.2A7 7 0 0 0 18.5 15" /></>,
    community: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20v-1a5.5 5.5 0 0 1 11 0v1M16 5.5a3 3 0 0 1 0 5.8M17 14a4.5 4.5 0 0 1 3.5 4.4v1" /></>,
    chat: <><path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.6 8.6 0 0 1-3.5-.7L4 20l1.2-3.6A7.2 7.2 0 0 1 4 12c0-4.3 3.6-7.5 8-7.5s8 2.7 8 7Z" /><path d="M8 12h.01M12 12h.01M16 12h.01" /></>,
    signals: <><path d="M3 12h3l2-6 4 12 3-8 2 2h4" /></>,
    announcements: <><path d="M4 14V9a2 2 0 0 1 2-2h3l9-4v17l-9-4H6a2 2 0 0 1-2-2Z" /><path d="m8 16 1.2 4h3.3" /></>,
    profile: <><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></>,
    settings: <><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="9" cy="6" r="1.6" fill="var(--background)" /><circle cx="15" cy="12" r="1.6" fill="var(--background)" /><circle cx="11" cy="18" r="1.6" fill="var(--background)" /></>,
    support: <><circle cx="12" cy="12" r="9" /><path d="M9.8 9a2.3 2.3 0 1 1 3.7 1.8c-.9.7-1.5 1-1.5 2.2M12 16.8h.01" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const excluded = ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/verify-email"];
  if (excluded.includes(pathname) || pathname.startsWith("/admin")) return children;
  const title = pageTitles.get(pathname) ?? "Workspace";
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const accountItems: NavItem[] = [
    { label: "Profile", href: "/profile", icon: "profile" },
    { label: "Settings", href: "/settings", icon: "settings" },
    { label: "Support", href: "/support", icon: "support" },
  ];

  async function logout() {
    try { await fetch("/api/logout", { method: "POST" }); }
    finally { window.location.href = "/login"; }
  }

  return <div className="workspace-shell">
    <button type="button" aria-label="Close navigation" onClick={() => setMenuOpen(false)} className={`workspace-scrim ${menuOpen ? "is-open" : ""}`} />
    <aside className={`workspace-sidebar ${menuOpen ? "is-open" : ""}`}>
      <Link href="/dashboard" className="workspace-brand" onClick={() => setMenuOpen(false)}>
        <BrandLogo className="h-[68px] w-[110px]" priority />
      </Link>
      <nav className="workspace-nav" aria-label="Workspace navigation">
        {sections.map((section) => <div key={section.label}><p className="workspace-nav-label">{section.label}</p>{section.items.map((item) => <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} aria-current={isActive(item.href) ? "page" : undefined} className={`workspace-nav-link ${isActive(item.href) ? "is-active" : ""}`}><span className="workspace-nav-icon"><WorkspaceIcon name={item.icon} /></span><span>{item.label}</span></Link>)}</div>)}
        <p className="workspace-nav-label">Your account</p>
        {accountItems.map((item) => <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} aria-current={isActive(item.href) ? "page" : undefined} className={`workspace-nav-link ${isActive(item.href) ? "is-active" : ""}`}><span className="workspace-nav-icon"><WorkspaceIcon name={item.icon} /></span><span>{item.label}</span></Link>)}
      </nav>
      <div className="workspace-sidebar-footer"><div className="workspace-member"><MivoMark className="workspace-member-avatar" /><span className="min-w-0"><span className="workspace-member-name block">Mivo member</span><span className="workspace-member-caption block">Your trading workspace</span></span></div><button type="button" onClick={logout} className="workspace-signout">Sign out</button></div>
    </aside>
    <div className="workspace-content">
      <header className="workspace-topbar"><div className="workspace-topbar-left"><button type="button" aria-label="Open navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)} className="workspace-mobile-menu">{"\u2630"}</button><p className="workspace-crumb">Workspace <span className="mx-2">/</span><strong>{title}</strong></p></div><div className="workspace-topbar-actions"><ThemeToggle /><Link href="/profile" aria-label="Open profile" className="workspace-profile-link"><MivoMark size={26} className="border-0" /></Link></div></header>
      {children}
    </div>
  </div>;
}
