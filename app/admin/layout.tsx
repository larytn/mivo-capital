"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BrandLogo } from "@/app/components/brand-logo";


const menuItems = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Members" },
  { href: "/admin/community", label: "Community post review" },
  { href: "/admin/vip-signals", label: "VIP Signals" },
  { href: "/admin/content", label: "Announcements" },
  { href: "/admin/support", label: "Support" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  async function logout() { await fetch("/api/logout", { method: "POST" }).catch(() => undefined); router.push("/admin/login"); router.refresh(); }
  return <div className="min-h-screen min-w-0 bg-background text-foreground"><header className="flex h-16 items-center justify-between gap-3 border-b border-border px-4 sm:px-5"><Link href="/admin" aria-label="Mivo Capital ecosystem administration" className="flex min-w-0 items-center gap-2 font-black"><BrandLogo className="h-[58px] w-[92px]" priority /><span className="truncate text-xs text-muted">ECOSYSTEM ADMIN</span></Link><button type="button" onClick={logout} className="shrink-0 text-sm text-muted">Log out</button></header><div className="mx-auto grid min-w-0 max-w-7xl gap-4 px-4 py-5 sm:gap-6 sm:px-8 sm:py-6 md:grid-cols-[220px_minmax(0,1fr)]"><nav className="flex min-w-0 gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-x-visible">{menuItems.map((item) => <Link key={item.href} href={item.href} className={`shrink-0 rounded-lg px-4 py-3 text-sm ${pathname === item.href ? "bg-foreground font-semibold text-background" : "text-muted hover:bg-surface"}`}>{item.label}</Link>)}</nav><main className="min-w-0">{children}</main></div></div>;
}
