"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Announcement = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  createdBy: { name: string };
};

const field = "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm";

export default function AdminContentPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/content?type=ANNOUNCEMENT", { cache: "no-store" });
    const data = await response.json();
    if (response.ok) setItems(Array.isArray(data.items) ? data.items : []);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const formElement = event.currentTarget;
    const data = Object.fromEntries(new FormData(formElement).entries());
    try {
      const response = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, type: "ANNOUNCEMENT" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to publish the announcement.");
      formElement.reset();
      setMessage("Announcement published.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to publish the announcement.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="max-w-4xl">
      <p className="text-xs font-bold uppercase tracking-widest text-muted">Community updates</p>
      <h1 className="mt-2 text-3xl font-black">Publish an announcement</h1>
      <p className="mt-2 text-sm text-muted">Share official Mivo updates with members in the community feed.</p>
      <form onSubmit={publish} className="mt-6 grid gap-3 rounded-2xl border border-border bg-surface p-5">
        <input name="title" required maxLength={180} placeholder="Title" className={field} />
        <textarea name="body" required maxLength={10000} rows={6} placeholder="Write an announcement" className={field} />
        <div className="flex items-center justify-between gap-3">
          {message && <p role="status" className="text-sm text-muted">{message}</p>}
          <button disabled={busy} className="ml-auto rounded-lg bg-foreground px-5 py-3 text-sm font-bold text-background disabled:opacity-50">
            {busy ? "Publishing…" : "Publish announcement"}
          </button>
        </div>
      </form>
      <div className="mt-8 space-y-3">
        <h2 className="font-bold">Published announcements</h2>
        {items.map((item) => (
          <article key={item.id} className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs uppercase tracking-widest text-muted">{item.createdBy.name} · {new Date(item.createdAt).toLocaleDateString()}</p>
            <h3 className="mt-2 font-bold">{item.title}</h3>
            <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-muted">{item.body}</p>
          </article>
        ))}
        {items.length === 0 && <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted">No announcements have been published.</p>}
      </div>
    </section>
  );
}
