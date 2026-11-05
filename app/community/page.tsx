"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";

type Comment = {
  id: string;
  content: string;
  author: { id: string; name: string };
  createdAt: string;
};

type Post = {
  id: string;
  title: string;
  content: string;
  category: string;
  moderationStatus: "APPROVED" | "REJECTED" | "PENDING";
  imageUrl: string | null;
  tradingViewUrl: string | null;
  isPinned: boolean;
  createdAt: string;
  author: { id: string; name: string; role: string };
  likesCount: number;
  comments: Comment[];
  likedByMe: boolean;
};

type OfficialPost = {
  id: string;
  type: "ANNOUNCEMENT";
  title: string;
  body: string;
  createdAt: string;
  createdBy: { name: string };
};

type FeedItem =
  | { kind: "community"; id: string; createdAt: string; post: Post }
  | { kind: "official"; id: string; createdAt: string; category: string; post: OfficialPost };

const categories = ["All posts", "Market Analysis", "Discussion", "Announcements"];

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

export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [moderationConfigured, setModerationConfigured] = useState<boolean | null>(null);
  const [officialPosts, setOfficialPosts] = useState<OfficialPost[]>([]);
  const [officialLoading, setOfficialLoading] = useState(true);
  const [officialError, setOfficialError] = useState("");
  const [unreadCounts, setUnreadCounts] = useState({ Announcements: 0 });
  const [activeCategory, setActiveCategory] = useState(categories[0]);
  const activeCategoryRef = useRef(activeCategory);
  const [search, setSearch] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [tradingViewUrl, setTradingViewUrl] = useState("");
  const [category, setCategory] = useState("Discussion");
  const [composerMessage, setComposerMessage] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!imagePreview.startsWith("blob:")) return;
    return () => URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/community", { cache: "no-store" });
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      const data = (await response.json()) as {
        posts?: Post[];
        currentUserId?: string;
        moderationConfigured?: boolean;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Unable to load posts.");
      setPosts(Array.isArray(data.posts) ? data.posts : []);
      setCurrentUserId(data.currentUserId || "");
      setModerationConfigured(Boolean(data.moderationConfigured));
      setNotice("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to load posts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  useEffect(() => {
    activeCategoryRef.current = activeCategory;
  }, [activeCategory]);

  useEffect(() => {
    if (activeCategory === "Market Analysis" || activeCategory === "Discussion") return;
    let cancelled = false;

    async function loadOfficialPosts() {
      const sections = [
        { type: "ANNOUNCEMENT", category: "Announcements" },
      ] as const;

      const results = await Promise.allSettled(
        sections.map(async (section) => {
          const response = await fetch(`/api/content?type=${section.type}`, { cache: "no-store" });
          const data = (await response.json()) as { items?: OfficialPost[]; unreadCount?: number; error?: string };
          if (!response.ok) throw new Error(data.error || `Unable to load ${section.category.toLowerCase()}.`);
          return {
            category: section.category,
            unreadCount: Math.max(0, Number(data.unreadCount) || 0),
            posts: (Array.isArray(data.items) ? data.items : []).map((post) => ({ ...post, type: section.type })),
          };
        }),
      );

      if (cancelled) return;

      const loaded: OfficialPost[] = [];
      const counts: Partial<Record<"Announcements", number>> = {};
      let failed = false;
      for (const result of results) {
        if (result.status === "fulfilled") {
          loaded.push(...result.value.posts);
          counts[result.value.category as "Announcements"] =
            activeCategoryRef.current === result.value.category ? 0 : result.value.unreadCount;
        }
        else failed = true;
      }
      setOfficialPosts(loaded);
      setUnreadCounts((current) => ({ ...current, ...counts }));
      setOfficialError(failed ? "Some official posts could not be loaded. Try again later." : "");
      setOfficialLoading(false);
    }

    const refreshWhileOnAllPosts = () => {
      if (document.visibilityState === "visible" && activeCategoryRef.current === "All posts") {
        void loadOfficialPosts();
      }
    };

    void loadOfficialPosts();
    const refreshTimer = window.setInterval(refreshWhileOnAllPosts, 60_000);
    window.addEventListener("focus", refreshWhileOnAllPosts);
    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
      window.removeEventListener("focus", refreshWhileOnAllPosts);
    };
  }, [activeCategory]);

  async function markOfficialSectionRead(category: string) {
    if (category !== "Announcements") return;
    const contentType = "ANNOUNCEMENT";
    try {
      const response = await fetch("/api/content/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType }),
      });
      const data = (await response.json()) as { error?: string };
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok) throw new Error(data.error || "Unable to update your read status.");
      setUnreadCounts((current) => ({ ...current, [category]: 0 }));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to update your read status.");
    }
  }

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const memberItems: FeedItem[] = posts
      .filter((post) => (activeCategory === "All posts" || post.category === activeCategory))
      .filter((post) => !query || `${post.title} ${post.content} ${post.author.name} ${post.category}`.toLowerCase().includes(query))
      .map((post) => ({ kind: "community", id: post.id, createdAt: post.createdAt, post }));

    const officialItems: FeedItem[] = officialPosts
      .map((post) => ({
        post,
        category: "Announcements",
      }))
      .filter(({ category }) => activeCategory === "All posts" || category === activeCategory)
      .filter(({ post, category }) => !query || `${post.title} ${post.body} ${post.createdBy.name} ${category}`.toLowerCase().includes(query))
      .map(({ post, category }) => ({ kind: "official", id: `${post.type}-${post.id}`, createdAt: post.createdAt, category, post }));

    return [...memberItems, ...officialItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [posts, officialPosts, activeCategory, search]);

  function openNewComposer() {
    setEditingPostId(null);
    setTitle("");
    setContent("");
    setCategory("Discussion");
    setImageFile(null);
    setExistingImageUrl(null);
    setImagePreview("");
    setTradingViewUrl("");
    setComposerMessage("");
    setComposerOpen(true);
  }

  function openEditComposer(post: Post) {
    setEditingPostId(post.id);
    setTitle(post.title);
    setContent(post.content);
    setCategory(post.category);
    setImageFile(null);
    setExistingImageUrl(post.imageUrl);
    setImagePreview(post.imageUrl || "");
    setTradingViewUrl(post.tradingViewUrl || "");
    setComposerMessage("Your edited post will stay private until it passes review.");
    setComposerOpen(true);
  }

  async function deletePost(post: Post) {
    if (busy || !window.confirm("Delete this post? Its comments and likes will also be removed.")) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(`/api/community/${encodeURIComponent(post.id)}`, { method: "DELETE" });
      const data = (await response.json()) as { deleted?: boolean; error?: string };
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok) throw new Error(data.error || "Unable to delete this post.");
      setPosts((current) => current.filter((item) => item.id !== post.id));
      setNotice("Your post was deleted.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to delete this post.");
    } finally {
      setBusy(false);
    }
  }

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!content.trim() || busy) return;
    setBusy(true);
    setNotice("");
    setComposerMessage("");
    try {
      let submittedImageUrl = existingImageUrl;
      if (imageFile) {
        const imageData = new FormData();
        imageData.append("file", imageFile);
        const uploadResponse = await fetch("/api/upload", { method: "POST", body: imageData });
        const uploadResult = (await uploadResponse.json()) as { url?: string; error?: string };
        if (uploadResponse.status === 401) {
          window.location.assign("/login");
          return;
        }
        if (!uploadResponse.ok || !uploadResult.url) {
          throw new Error(uploadResult.error || "Unable to upload your chart screenshot.");
        }
        submittedImageUrl = uploadResult.url;
      }

      const isEditing = Boolean(editingPostId);
      const response = await fetch(
        isEditing ? `/api/community/${encodeURIComponent(editingPostId as string)}` : "/api/community",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content, category, imageUrl: submittedImageUrl, tradingViewUrl }),
        },
      );
      const data = (await response.json()) as {
        error?: string;
        message?: string;
        postId?: string;
        moderationStatus?: "APPROVED" | "REJECTED" | "PENDING";
      };
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok) throw new Error(data.error || "Unable to submit your post.");
      if (data.moderationStatus === "REJECTED") {
        if (!isEditing && data.postId) setEditingPostId(data.postId);
        await load();
        setComposerMessage(data.message || "This post needs changes before it can be shared.");
        return;
      }
      setTitle("");
      setContent("");
      setCategory("Discussion");
      setImageFile(null);
      setExistingImageUrl(null);
      setImagePreview("");
      setTradingViewUrl("");
      setEditingPostId(null);
      setComposerOpen(false);
      await load();
      setNotice(data.message || "Your post is private and waiting for review.");
    } catch (error) {
      setComposerMessage(error instanceof Error ? error.message : "Unable to submit your post.");
    } finally {
      setBusy(false);
    }
  }

  async function interact(post: Post, action: "like" | "comment") {
    const text = commentDrafts[post.id] || "";
    if (action === "comment" && !text.trim()) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/community/" + post.id, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, content: text }),
      });
      const data = (await response.json()) as {
        error?: string;
        liked?: boolean;
        count?: number;
        comment?: Comment;
      };
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok) throw new Error(data.error || "Unable to update this post.");
      if (action === "like") {
        setPosts((current) =>
          current.map((item) =>
            item.id === post.id
              ? { ...item, likedByMe: Boolean(data.liked), likesCount: Number(data.count || 0) }
              : item,
          ),
        );
      } else if (data.comment) {
        setPosts((current) =>
          current.map((item) =>
            item.id === post.id
              ? { ...item, comments: [...item.comments, data.comment as Comment] }
              : item,
          ),
        );
        setCommentDrafts((current) => ({ ...current, [post.id]: "" }));
        setOpenComments((current) => ({ ...current, [post.id]: true }));
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to update this post.");
    } finally {
      setBusy(false);
    }
  }

  async function share(post: Post) {
    const url = window.location.origin + "/community#post-" + encodeURIComponent(post.id);
    try {
      if (navigator.share) {
        await navigator.share({
          title: post.title,
          text: post.content.slice(0, 180),
          url,
        });
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setNotice("Post link copied. You can share it with your community.");
        return;
      }
      window.prompt("Copy this post link to share it:", url);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setNotice("Unable to share this post right now.");
    }
  }

  const field =
    "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent/60";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href="/dashboard" className="text-sm text-muted">← Workspace</Link>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-accent">Mivo Capital / Community</p>
            <h1 className="mt-2 text-4xl font-black">Feed &amp; discussions</h1>
            <p className="mt-2 text-sm text-muted">Market ideas and conversations from the Mivo community.</p>
          </div>
          <Link href="/chat" className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition hover:bg-surface">
            Open the shared trader chat
          </Link>
        </header>

        <div className="mt-8 flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 sm:p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-black text-accent">M</div>
          <button
            type="button"
            onClick={openNewComposer}
            className="flex min-h-11 flex-1 items-center rounded-xl bg-background px-4 text-left text-sm text-muted transition hover:bg-surface-raised"
          >
            What&apos;s on your mind?
          </button>
          <button
            type="button"
            onClick={openNewComposer}
            aria-label="Create a post"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-2xl font-semibold text-accent-foreground transition hover:bg-accent/90"
          >
            +
          </button>
        </div>
        <p className="mt-2 px-1 text-xs text-muted">
          {moderationConfigured === false
            ? "AI review is not configured on this server. Your posts stay private for Mivo team review until it is enabled."
            : "AI reviews member posts first. Clear, suitable posts appear right away; uncertain reviews stay private for the Mivo team."}
        </p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setActiveCategory(item);
                  void markOfficialSectionRead(item);
                }}
                aria-pressed={activeCategory === item}
                className={
                  "shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition " +
                  (activeCategory === item
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border text-muted hover:bg-surface")
                }
              >
                {item}
                {item === "Announcements" && unreadCounts.Announcements > 0 && (
                  <span
                    aria-label={`${unreadCounts.Announcements} new announcements`}
                    className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white"
                  >
                    {unreadCounts.Announcements > 99 ? "99+" : unreadCounts.Announcements}
                  </span>
                )}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search community posts"
            className={field + " sm:ml-auto sm:max-w-xs"}
          />
        </div>
        <p className="mt-2 px-1 text-xs text-muted">Announcements are published by the Mivo team and are view-only for members.</p>

        {notice && (
          <p role="status" className="mt-4 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
            {notice}
          </p>
        )}

        {loading ? (
          <p className="mt-8 text-sm text-muted">Loading community posts…</p>
        ) : (
          <div className="mt-5 space-y-4">
            {visibleItems.map((item) => {
              if (item.kind === "official") {
                const post = item.post;
                return (
                  <article key={item.id} className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
                          Mivo announcement
                        </p>
                        <p className="mt-1 text-xs text-muted">{formatDate(post.createdAt)}</p>
                      </div>
                      <span className="rounded-full bg-surface-raised px-3 py-1 text-xs text-muted">{item.category}</span>
                    </div>
                    <h2 className="mt-4 text-lg font-bold">{post.title}</h2>
                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-foreground/90">{post.body}</p>
                    <p className="mt-4 text-xs text-muted">Published by {post.createdBy.name}</p>
                  </article>
                );
              }

              const post = item.post;
              const commentsOpen = Boolean(openComments[post.id]);
              const firstLine = post.content.split(/\r?\n/).find((line) => line.trim()) || "";
              const showTitle = post.title !== firstLine.slice(0, 120);
              return (
                <article
                  id={"post-" + post.id}
                  key={post.id}
                  className="scroll-mt-24 rounded-2xl border border-border bg-surface p-5 sm:p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {post.author.name}
                        <span className="ml-2 text-xs font-normal text-muted">
                          {post.author.role === "ADMIN" ? "Mivo team" : "Member"}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-muted">{formatDate(post.createdAt)}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                      {post.author.id === currentUserId && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditComposer(post)}
                            disabled={busy}
                            className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-background disabled:opacity-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void deletePost(post)}
                            disabled={busy}
                            className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </>
                      )}
                      <span className="rounded-full bg-surface-raised px-3 py-1 text-xs text-muted">{post.category}</span>
                    </div>
                  </div>
                  {post.moderationStatus !== "APPROVED" && post.author.id === currentUserId && (
                    <p role="status" className="mt-4 rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted">
                      {post.moderationStatus === "REJECTED"
                        ? "This post did not pass review and is private. Edit it to make changes and submit it again."
                        : "This post is private while it waits for review."}
                    </p>
                  )}
                  {showTitle && <h2 className="mt-4 text-lg font-bold">{post.title}</h2>}
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-foreground/90">{post.content}</p>
                  {post.imageUrl && (
                    <a href={post.imageUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block max-w-full">
                      <img
                        src={post.imageUrl}
                        alt="Chart screenshot shared with this post"
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
                      Open chart on TradingView ↗
                    </a>
                  )}

                  {post.moderationStatus === "APPROVED" && <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-3">
                    <button
                      type="button"
                      disabled={busy}
                      aria-pressed={post.likedByMe}
                      onClick={() => void interact(post, "like")}
                      className={"text-sm transition hover:text-accent disabled:opacity-50 " + (post.likedByMe ? "font-semibold text-accent" : "text-muted")}
                    >
                      {post.likedByMe ? "♥ Liked" : "♡ Like"} · {post.likesCount}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpenComments((current) => ({ ...current, [post.id]: !current[post.id] }))}
                      aria-expanded={commentsOpen}
                      className="text-sm text-muted transition hover:text-foreground"
                    >
                      ◯ Comment · {post.comments.length}
                    </button>
                    <button
                      type="button"
                      onClick={() => void share(post)}
                      className="text-sm text-muted transition hover:text-foreground"
                    >
                      ↗ Share
                    </button>
                  </div>}

                  {post.moderationStatus === "APPROVED" && commentsOpen && (
                    <section aria-label="Comments" className="mt-4 border-t border-border pt-4">
                      <div className="space-y-4">
                        {post.comments.map((comment) => (
                          <div key={comment.id} className="flex gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background text-xs font-bold text-muted">
                              {comment.author.name.slice(0, 1).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-baseline gap-x-2">
                                <span className="text-sm font-semibold">{comment.author.name}</span>
                                <time className="text-xs text-muted">{formatDate(comment.createdAt)}</time>
                              </div>
                              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-muted">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                        {post.comments.length === 0 && <p className="text-sm text-muted">Be the first to join this discussion.</p>}
                      </div>
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          void interact(post, "comment");
                        }}
                        className="mt-4 flex gap-2"
                      >
                        <input
                          value={commentDrafts[post.id] || ""}
                          onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))}
                          placeholder="Write a comment…"
                          maxLength={1200}
                          className={field}
                        />
                        <button
                          type="submit"
                          disabled={busy || !(commentDrafts[post.id] || "").trim()}
                          className="shrink-0 rounded-xl border border-border px-4 text-sm font-semibold transition hover:bg-background disabled:opacity-50"
                        >
                          Reply
                        </button>
                      </form>
                    </section>
                  )}
                </article>
              );
            })}
            {visibleItems.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center">
                <h2 className="font-semibold">
                  {search
                    ? "No posts match your search"
                    : officialLoading && activeCategory !== "Market Analysis" && activeCategory !== "Discussion"
                      ? "Loading official posts…"
                      : officialError && activeCategory === "Announcements"
                        ? "Official posts could not load"
                        : activeCategory === "Announcements"
                          ? "No announcements yet"
                            : "No approved posts yet"}
                </h2>
                <p className="mt-2 text-sm text-muted">
                  {search
                    ? "Try another search or category."
                    : officialError && activeCategory === "Announcements"
                      ? officialError
                      : activeCategory === "Announcements"
                        ? "Official posts from the Mivo team will appear here. Members can view them but cannot submit to these sections."
                        : "Suitable member posts appear right away. Posts that need a closer look stay private while they are reviewed."}
                </p>
              </div>
            )}
          </div>
        )}

        <footer className="mt-12 border-t border-border py-5 text-xs text-muted">
          One shared trader chat is available for community conversation. Mivo does not provide private member DMs.
        </footer>
      </div>

      {composerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-black/60 p-4 sm:items-center"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) setComposerOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="composer-title"
            className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto overscroll-contain rounded-2xl border border-border bg-background p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Community post</p>
                <h2 id="composer-title" className="mt-2 text-xl font-bold">
                  {editingPostId ? "Edit your post" : "What's on your mind?"}
                </h2>
              </div>
              <button type="button" onClick={() => setComposerOpen(false)} disabled={busy} aria-label="Close" className="rounded-lg px-3 py-1 text-xl text-muted hover:bg-surface">
                ×
              </button>
            </div>
            {composerMessage && (
              <p role="status" aria-live="polite" className="mt-4 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
                {composerMessage}
              </p>
            )}
            <form onSubmit={(event) => void publish(event)} className="mt-5 space-y-3">
              <label className="block text-sm font-semibold">
                Post type
                <select value={category} onChange={(event) => setCategory(event.target.value)} className={field + " mt-2"}>
                  <option value="Discussion">Discussion</option>
                  <option value="Market Analysis">Market Analysis</option>
                </select>
              </label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Add a title (optional)"
                maxLength={120}
                className={field}
              />
              <textarea
                autoFocus
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Share a market idea, ask a question, or start a discussion…"
                rows={6}
                maxLength={3000}
                className={field + " resize-y"}
              />
              <div className="rounded-xl border border-border bg-surface p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="inline-flex cursor-pointer items-center rounded-lg border border-border px-3 py-2 text-sm font-semibold transition hover:bg-background">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0];
                        event.currentTarget.value = "";
                        if (!file) return;
                        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
                          setNotice("Choose a JPG, PNG, or WEBP chart screenshot.");
                          return;
                        }
                        if (file.size > 5 * 1024 * 1024) {
                          setNotice("The screenshot must be 5 MB or smaller.");
                          return;
                        }
                        setNotice("");
                        setImageFile(file);
                        setExistingImageUrl(null);
                        setImagePreview(URL.createObjectURL(file));
                      }}
                    />
                    {imageFile || existingImageUrl ? "Change screenshot" : "Add chart screenshot"}
                  </label>
                  <span className="text-xs text-muted">One image · JPG, PNG or WEBP · up to 5 MB</span>
                </div>
                {imagePreview && (
                  <div className="mt-3 flex items-start gap-3">
                    <img src={imagePreview} alt="Screenshot preview" className="max-h-40 max-w-[60%] rounded-lg border border-border object-contain" />
                    <button
                      type="button"
                      onClick={() => { setImageFile(null); setExistingImageUrl(null); setImagePreview(""); }}
                      className="rounded-lg px-3 py-2 text-xs font-semibold text-muted hover:bg-background hover:text-foreground"
                    >
                      Remove image
                    </button>
                  </div>
                )}
              </div>
              <label className="block text-sm font-semibold">
                TradingView chart link <span className="font-normal text-muted">(optional)</span>
                <input
                  type="url"
                  value={tradingViewUrl}
                  onChange={(event) => setTradingViewUrl(event.target.value)}
                  placeholder="Paste a shared TradingView chart link"
                  maxLength={2048}
                  className={field + " mt-2"}
                />
                <span className="mt-1 block text-xs font-normal text-muted">Reviewed with your post; members open the chart on TradingView.</span>
              </label>
              <div className="sticky bottom-0 -mx-5 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background px-5 pb-1 pt-3 text-xs text-muted sm:-mx-6 sm:px-6">
                <span>
                  {content.length}/3000 · {moderationConfigured === false
                    ? "Your post will stay private for Mivo team review until AI review is configured."
                    : "AI checks your notes and screenshot. Only TradingView chart links are accepted."}
                </span>
                <button
                  type="submit"
                  disabled={busy || !content.trim()}
                  className="rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-accent-foreground transition hover:bg-accent/90 disabled:opacity-50"
                >
                  {busy
                    ? "Reviewing…"
                    : moderationConfigured === false
                      ? "Submit for team review"
                      : editingPostId
                        ? "Submit edit for AI review"
                        : "Submit for AI review"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
