"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MemberAvatar } from "@/app/components/member-avatar";

type Profile = { id: string; name: string; nickname: string; avatarUrl: string | null; email: string; role: string; createdAt: string; referralCode: string | null };

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/profile", { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (response.status === 401) { window.location.href = "/login"; return; }
      if (!response.ok) { setError(data.error || "Unable to load your profile."); return; }
      setProfile(data.profile);
    }).catch(() => setError("Unable to load your profile."));
  }, []);

  return <main className="min-h-screen bg-background text-foreground"><section className="mx-auto max-w-5xl px-4 py-7 sm:px-8 sm:py-10"><Link href="/dashboard" className="text-sm text-muted hover:text-foreground">← Workspace</Link><p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-muted sm:mt-8">Your account</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">Profile</h1><p className="mt-3 text-sm text-muted sm:text-base">Manage your Mivo Capital member account.</p>{error && <p className="mt-6 rounded-xl border border-red-500/30 p-4 text-sm text-red-400">{error}</p>}{!profile && !error ? <p className="mt-8 text-sm text-muted">Loading profile…</p> : profile && <div className="mt-8 grid gap-3 sm:grid-cols-2 sm:gap-4"><div className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 sm:col-span-2 sm:p-6"><MemberAvatar name={profile.nickname} imageUrl={profile.avatarUrl} size={60} /><div className="min-w-0"><h2 className="truncate text-xl font-bold">@{profile.nickname}</h2><p className="mt-1 truncate text-sm text-muted">{profile.name}</p></div><Link href="/settings" className="ml-auto rounded-lg border border-border px-4 py-2 text-sm font-semibold">Edit profile</Link></div>{[["Name", profile.name], ["Email", profile.email], ["Member since", new Date(profile.createdAt).toLocaleDateString()], ["Account role", profile.role]].map(([label, value]) => <div key={label} className="min-w-0 rounded-2xl border border-border bg-surface p-4 sm:p-6"><p className="text-sm text-muted">{label}</p><p className="mt-2 break-all font-semibold">{value}</p></div>)}<div className="rounded-2xl border border-border bg-surface p-4 sm:col-span-2 sm:p-6"><h2 className="font-bold">Your workspace</h2><p className="mt-2 text-sm text-muted">Continue learning, researching, journaling and connecting with other traders.</p><Link href="/dashboard" className="mt-4 inline-flex rounded-lg bg-foreground px-4 py-2 text-sm font-bold text-background">Open workspace</Link></div></div>}</section></main>;
}
