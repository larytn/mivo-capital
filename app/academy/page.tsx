"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
type Item = { id: string; title: string; body: string; createdAt: string; createdBy: { name: string } };
export default function AcademyPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadAcademy() {
      try {
        const response = await fetch("/api/content?type=ACADEMY", { cache: "no-store" });
        const data = await response.json();
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok) throw new Error(data.error || "Unable to load Mivo Academy.");
        if (active) setItems(Array.isArray(data.items) ? data.items : []);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load Mivo Academy.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadAcademy();
    return () => { active = false; };
  }, []);

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:py-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/dashboard" className="text-sm text-muted">← Workspace</Link>
        <p className="mt-8 text-xs font-bold uppercase tracking-widest text-muted">Mivo Capital · Education</p>
        <h1 className="mt-2 text-4xl font-black">Mivo Academy</h1>
        <p className="mt-3 max-w-2xl text-muted">Structured learning for traders, from market foundations to strategy research and risk discipline.</p>
        <div className="mt-8 space-y-4">
          {error && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/5 p-4 text-sm text-red-300">{error}</p>}
          {loading && <p className="text-sm text-muted">Loading Academy lessons…</p>}
          {items.map((item) => <article key={item.id} className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-xs text-muted">{new Date(item.createdAt).toLocaleDateString()} · {item.createdBy.name}</p>
            <h2 className="mt-2 text-xl font-bold">{item.title}</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted">{item.body}</p>
          </article>)}
          {!loading && !error && items.length === 0 && <section className="rounded-2xl border border-dashed border-border p-8 sm:p-10">
            <h2 className="text-xl font-bold">Learning paths are being prepared</h2>
            <p className="mt-2 text-sm text-muted">The Academy is open. New lessons will appear here when published by the Mivo education team.</p>
          </section>}
        </div>
      </div>
    </main>
  );
}
