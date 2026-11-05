"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { MemberAvatar } from "@/app/components/member-avatar";

type Comment = {
  id: string;
  content: string;
  author: { id: string; name: string; nickname: string; avatarUrl: string | null };
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
  author: { id: string; name: string; nickname: string; avatarUrl: string | null; role: string };
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

function CommunityIcon({ name }: { name: "like" | "comment" | "share" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      {name === "like" ? <path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6l1.2 1.2L12 21l7.6-7.6 1.2-1.2a5.4 5.4 0 0 0 0-7.6Z" /> : name === "comment" ? <path d="M20.5 11.6a8.5 8.5 0 0 1-9 8.4 9.6 9.6 0 0 1-4.2-.9L3 21l1.6-3.9A8 8 0 0 1 3 11.6C3 7 6.8 4 11.5 4s9 3 9 7.6Z" /> : <><path d="M12 16V3M7 8l5-5 5 5" /><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></>}
    </svg>
  );
}

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
  const [currentUserIdentity, setCurrentUserIdentity] = useState<{ nickname: string; avatarUrl: string | null }>({ nickname: "Trader", avatarUrl: null });
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
        currentUser?: { nickname?: string; avatarUrl?: string | null } | null;
        moderationConfigured?: boolean;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Unable to load posts.");
      setPosts(Array.isArray(data.posts) ? data.posts : []);
      setCurrentUserId(data.currentUserId || "");
      if (data.currentUser?.nickname) {
        setCurrentUserIdentity({ nickname: data.currentUser.nickname, avatarUrl: data.currentUser.avatarUrl ?? null });
      }
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
      .filter((post) => !query || `${post.title} ${post.content} ${post.author.nickname} ${post.author.name} ${post.category}`.toLowerCase().includes(query))
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
    <main className="community-page">
      <div className="community-feed-shell">
        <header className="community-feed-header">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">Mivo Capital</p>
              <h1 className="community-feed-title mt-1">Community</h1>
            </div>
            <Link href="/chat" className="rounded-md border border-border px-3 py-2 text-xs font-semibold text-muted transition hover:bg-surface hover:text-foreground">Trader chat</Link>
          </div>
          <div className="community-feed-tabs" role="tablist" aria-label="Community categories">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={activeCategory === item}
                onClick={() => { setActiveCategory(item); void markOfficialSectionRead(item); }}
                className="community-tab"
              >
                {item}
                {item === "Announcements" && unreadCounts.Announcements > 0 && <span className="ml-2 text-[10px] text-accent">{unreadCounts.Announcements > 99 ? "99+" : unreadCounts.Announcements}</span>}
              </button>
            ))}
          </div>
        </header>

        <div className="community-composer">
          <MemberAvatar name={currentUserIdentity.nickname} imageUrl={currentUserIdentity.avatarUrl} size={40} className="community-post-avatar" />
          <button type="button" onClick={openNewComposer} className="community-compose-prompt">What&apos;s happening in the markets?</button>
          <button type="button" onClick={openNewComposer} className="community-compose-submit">Post</button>
        </div>
        <p className="mt-2 px-1 text-xs text-muted">
          {moderationConfigured === false
            ? "AI review is not configured on this server. Your posts stay private for Mivo team review until it is enabled."
            : "AI reviews member posts first. Clear, suitable posts appear right away; uncertain reviews stay private for the Mivo team."}
        </p>

        <div className="px-5 py-3 sm:px-6">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search community posts"
            className="community-search"
          />
        </div>
        <p className="px-5 pb-3 text-[10px] text-muted sm:px-6">Announcements are published by the Mivo team and are view-only for members.</p>

        {notice && (
          <p role="status" className="mt-4 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
            {notice}
          </p>
        )}

        {loading ? (
          <p className="mt-8 text-sm text-muted">Loading community posts…</p>
        ) : (
          <div>
            {visibleItems.map((item) => {
              if (item.kind === "official") {
                const post = item.post;
                return (
                  <article key={item.id} className="community-post">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="community-post-author"><span className="community-post-avatar">M</span><p className="truncate text-sm font-semibold">Mivo team</p><time className="text-xs text-muted">{formatDate(post.createdAt)}</time></div>
                      </div>
                      <span className="community-post-category">{item.category}</span>
                    </div>
                    <h2 className="community-post-title">{post.title}</h2>
                    <p className="community-post-content">{post.body}</p>
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
                  className="community-post scroll-mt-24"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="community-post-author">
                      <MemberAvatar name={post.author.nickname} imageUrl={post.author.avatarUrl} size={36} className="community-post-avatar" />
                      <span className="min-w-0 truncate text-sm font-semibold">@{post.author.nickname}</span>
                      {post.author.role === "ADMIN" && <span className="truncate text-[10px] text-accent">Mivo team</span>}
                      <time className="shrink-0 text-xs text-muted">· {formatDate(post.createdAt)}</time>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                      {post.author.id === currentUserId && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditComposer(post)}
                            disabled={busy}
                            className="rounded-md border border-border px-2.5 py-1 text-[10px] font-semibold transition hover:bg-background disabled:opacity-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void deletePost(post)}
                            disabled={busy}
                            className="rounded-md border border-border px-2.5 py-1 text-[10px] font-semibold text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </>
                      )}
                      <span className="community-post-category hidden sm:inline-flex">{post.category}</span>
                    </div>
                  </div>
                  {post.moderationStatus !== "APPROVED" && post.author.id === currentUserId && (
                    <p role="status" className="mt-4 rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted">
                      {post.moderationStatus === "REJECTED"
                        ? "This post did not pass review and is private. Edit it to make changes and submit it again."
                        : "This post is private while it waits for review."}
                    </p>
                  )}
                  {showTitle && <h2 className="community-post-title">{post.title}</h2>}
                  <p className="community-post-content">{post.content}</p>
                  {post.imageUrl && (
                    <a href={post.imageUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block max-w-full">
                      <img
                        src={post.imageUrl}
                        alt="Chart screenshot shared with this post"
                        loading="lazy"
                        className="community-post-media"
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

                  {post.moderationStatus === "APPROVED" && <div className="community-post-actions">
                    <button
                      type="button"
                      disabled={busy}
                      aria-pressed={post.likedByMe}
                      onClick={() => void interact(post, "like")}
                      aria-label={`${post.likedByMe ? "Unlike" : "Like"} post`}
                      className={`community-post-action${post.likedByMe ? " is-liked" : ""}`}
                    >
                      <CommunityIcon name="like" /><span>{post.likesCount}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpenComments((current) => ({ ...current, [post.id]: !current[post.id] }))}
                      aria-expanded={commentsOpen}
                      aria-label={`${commentsOpen ? "Hide" : "Show"} comments`}
                      className="community-post-action"
                    >
                      <CommunityIcon name="comment" /><span>{post.comments.length}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void share(post)}
                      aria-label="Share post"
                      className="community-post-action"
                    >
                      <CommunityIcon name="share" /><span>Share</span>
                    </button>
                  </div>}

                  {post.moderationStatus === "APPROVED" && commentsOpen && (
                    <section aria-label="Comments" className="community-post-comments">
                      <div className="space-y-4">
                        {post.comments.map((comment) => (
                          <div key={comment.id} className="flex gap-3">
                            <MemberAvatar name={comment.author.nickname} imageUrl={comment.author.avatarUrl} size={32} />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-baseline gap-x-2">
                                <span className="text-sm font-semibold">@{comment.author.nickname}</span>
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
