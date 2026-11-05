import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [members, posts, journalEntries] = await Promise.all([
    prisma.user.count(), prisma.communityPost.count(), prisma.journalTrade.count(),
  ]);
  const stats = [["Members", members], ["Community posts", posts], ["Journal entries", journalEntries]] as const;
  return <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Mivo Capital</p><h1 className="mt-2 text-3xl font-black">Ecosystem overview</h1><p className="mt-2 text-sm text-muted">Member and activity snapshot for the trading community.</p><div className="mt-6 grid gap-4 sm:grid-cols-3">{stats.map(([label, value]) => <div key={label} className="rounded-2xl border border-border bg-surface p-5"><p className="text-sm text-muted">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>)}</div><section className="mt-8 rounded-2xl border border-border bg-surface p-6"><h2 className="font-bold">Workspace administration</h2><p className="mt-2 text-sm text-muted">Manage member access and respond to community support requests.</p><div className="mt-5 flex flex-wrap gap-3"><Link href="/admin/users" className="rounded-lg border border-border px-4 py-2 text-sm">Manage members</Link><Link href="/admin/support" className="rounded-lg border border-border px-4 py-2 text-sm">Review support</Link></div></section></div>;
}
