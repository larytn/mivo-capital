"use client";

import { useCallback, useEffect, useState } from "react";

type PendingPost = {
  id: string;
  title: string;
  content: string;
  category: string;
  imageUrl: string | null;
  tradingViewUrl: string | null;
  createdAt: string;
  author: { name: string; email: string; role: string };
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function AdminCommunityReviewPage() {
  const [posts, setPosts] = useState<PendingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/community", { cache: "no-store" });
      if (response.status === 401 || response.status === 403) {
        window.location.href = "/admin/login";
        return;
      }
      const data = (await response.json()) as { posts?: PendingPost[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to load posts.");
      setPosts(Array.isArray(data.posts) ? data.posts : []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load posts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  async function review(post: PendingPost, action: "approve" | "reject") {
    setBusyId(post.id);
    setMessage("");
    try {
      const response = await fetch("/api/admin/community", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: post.id, action }),
      });
      const data = (await response.json()) as { error?: string };
      if (response.status === 401 || response.status === 403) {
        window.location.assign("/admin/login");
        return;
      }
      if (!response.ok) throw new Error(data.error || "Unable to review this post.");
      setPosts((current) => current.filter((item) => item.id !== post.id));
      setMessage(action === "approve" ? "Post approved and added to the public feed." : "Post rejected and kept out of the public feed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to review this post.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="max-w-4xl">
      <p className="text-xs font-bold uppercase tracking-widest text-muted">Community safety</p>
      <h1 className="mt-2 text-3xl font-black">Review member posts</h1>
      <p className="mt-2 text-sm text-muted">
        AI publishes clear, community-safe posts immediately. Submissions that are ambiguous or could not be reviewed automatically stay private here for a Mivo admin. Members can submit Market Analysis and Discussion posts.
      </p>

      <div className="mt-6 flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
        <span className="text-sm font-semibold">Awaiting human review</span>
        <span className="rounded-full bg-background px-3 py-1 text-sm font-bold">{posts.length}</span>
      </div>

      {message && <p role="status" className="mt-4 rounded-xl border border-border bg-surface p-3 text-sm">{message}</p>}
      {loading ? (
        <p className="mt-6 text-sm text-muted">Loading submissions…</p>
      ) : posts.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-border p-8 text-center">
          <h2 className="font-semibold">Nothing to review</h2>
          <p className="mt-2 text-sm text-muted">Posts that need a person to review them will appear here. Suitable posts publish after AI review.</p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {posts.map((post) => (
            <article key={post.id} className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{post.author.name}</p>
                  <p className="mt-1 text-xs text-muted">{post.author.email} · {formatDate(post.createdAt)}</p>
                </div>
                <span className="rounded-full bg-background px-3 py-1 text-xs text-muted">{post.category}</span>
              </div>
              <h2 className="mt-4 text-lg font-bold">{post.title}</h2>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-foreground/90">{post.content}</p>
              {post.imageUrl && (
                <a href={post.imageUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block max-w-full">
                  <img
                    src={post.imageUrl}
                    alt="Chart screenshot submitted for review"
                    loading="lazy"
                    className="max-h-[560px] max-w-full rounded-xl border border-border object-contain"
                  />
                </a>
              )}
              {post.tradingViewUrl && (
                <a
                  href={post.tradingViewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex text-sm font-semibold text-accent hover:underline"
                >
                  Open submitted chart on TradingView ↗
                </a>
              )}
              <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => void review(post, "reject")}
                  disabled={busyId === post.id}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted transition hover:bg-background disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => void review(post, "approve")}
                  disabled={busyId === post.id}
                  className="rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground transition hover:bg-accent/90 disabled:opacity-50"
                >
                  {busyId === post.id ? "Saving…" : "Approve post"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
