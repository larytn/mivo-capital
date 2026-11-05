"use client";

import Link from "next/link";
import Image from "next/image";
import { createPortal } from "react-dom";
import {
  type FormEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { CHAT_REACTION_EMOJIS, CHAT_STICKERS } from "@/lib/chat-catalog";
import { MemberAvatar } from "@/app/components/member-avatar";

type Message = {
  id: string;
  content: string;
  kind: "TEXT" | "STICKER" | "GIF";
  mediaKey: string | null;
  mediaUrl: string | null;
  createdAt: string;
  author: { id: string; name: string; nickname: string; avatarUrl: string | null; role: string };
  reactions: Reaction[];
};

type MessageMenu = { id: string; x: number; y: number } | null;
type ReactionPicker = { messageId: string; left: number; top: number; width: number } | null;
type Reaction = { emoji: string; count: number; reactedByMe: boolean };
type ReactionGlyph = "sticker" | "media" | "bookmark";
type ReactionOption = { emoji: string; label: string };
type MediaPicker = "STICKER" | "GIF" | null;
type SavedSticker = { id: string; key: string; stickerKey: string | null; mediaUrl: string | null; label: string; createdAt: string };
type LongPressStart = { pointerId: number; messageId: string; x: number; y: number; anchor: HTMLElement };

const GIFS = [
  { key: "rocket", label: "To the moon" },
  { key: "celebrate", label: "Celebrate" },
  { key: "laugh", label: "That was funny" },
  { key: "mindblown", label: "Mind blown" },
  { key: "focus", label: "Locked in" },
  { key: "gg", label: "Good game" },
  { key: "cry", label: "Pain" },
  { key: "fire", label: "Fire setup" },
  { key: "clap", label: "Well played" },
] as const;

const NAMED_REACTION_OPTIONS: ReactionOption[] = [
  { emoji: "👍", label: "Like" },
  { emoji: "❤️", label: "Love" },
  { emoji: "😂", label: "Funny" },
  { emoji: "🙏", label: "Thanks" },
  { emoji: "👀", label: "Watching" },
  { emoji: "✅", label: "Agreed" },
  { emoji: "📈", label: "Bullish" },
  { emoji: "📉", label: "Bearish" },
  { emoji: "⚠️", label: "Risk alert" },
];
const REACTION_OPTIONS = NAMED_REACTION_OPTIONS;
const QUICK_REACTIONS = ["👍", "❤️", "✅"]
  .map((emoji) => REACTION_OPTIONS.find((option) => option.emoji === emoji))
  .filter((option): option is ReactionOption => !!option);
const REACTION_CATEGORIES = {
  all: CHAT_REACTION_EMOJIS,
  faces: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "🥲", "😊", "😇", "🙂", "🙃", "😉", "😍", "🥰", "😘", "😋", "😜", "🤪", "🤗", "🤔", "🫡", "🤫", "🤭", "🫠", "😬", "😎", "🤓", "🥳", "🥺", "😢", "😭", "😤", "😡", "🤯", "🥱", "😴", "🙄", "🤷"],
  people: ["🙏", "👏", "🙌", "👐", "🤲", "💪", "🤝", "👌", "✌️", "🤞", "🤟", "🤘", "🤙", "👋", "✋", "🖐️", "🫶", "🫰", "👀"],
  trading: ["🔥", "💯", "✅", "⭐", "🌟", "✨", "🎉", "🎊", "🏆", "🎯", "🚀", "💰", "💸", "📈", "📉", "🐂", "🐻", "💎", "👑", "☕", "💡"],
} as const;
type ReactionCategory = keyof typeof REACTION_CATEGORIES;
const REACTION_CATEGORY_LABELS: Record<ReactionCategory, string> = { all: "All", faces: "Faces", people: "People", trading: "Trading" };
const REACTION_SEARCH_TERMS: Record<string, string> = {
  "👍": "thumb up like", "👎": "thumb down dislike", "❤️": "heart love", "🔥": "fire flame hot", "😂": "laugh funny tears", "👀": "eyes watch looking",
  "🙏": "pray thanks please", "👏": "clap applause", "💪": "strong muscle", "🎉": "party celebrate", "🎊": "party confetti", "🚀": "rocket moon launch",
  "💰": "money cash bag", "💸": "money cash flying", "📈": "chart up bullish", "📉": "chart down bearish", "🐂": "bull bullish", "🐻": "bear bearish",
  "💎": "diamond hands", "🎯": "target focus", "✅": "check done correct", "☕": "coffee", "🤔": "thinking", "🤯": "mind blown surprise",
  "🥳": "celebrate party", "😢": "sad cry", "😭": "cry tears", "😎": "cool sunglasses", "😍": "love heart", "💡": "idea insight",
  "😀": "grinning smile happy", "😃": "smile happy", "😄": "smile laugh", "😁": "grin", "😆": "laugh grin", "😅": "sweat smile",
  "🤣": "rolling laughing", "😊": "blush smile", "😉": "wink", "🥰": "love hearts", "😘": "kiss", "😋": "yum delicious",
  "😜": "wink tongue", "🤪": "crazy silly", "🤗": "hug", "🤫": "quiet shush", "🤭": "giggle", "😬": "grimace nervous",
  "🥺": "pleading puppy eyes", "😤": "frustrated", "😡": "angry rage", "🥱": "yawn", "😴": "sleep tired", "🙄": "eye roll",
  "🤷": "shrug whatever", "⭐": "star favorite", "🌟": "glowing star", "✨": "sparkles", "🏆": "trophy winner", "👑": "crown king queen",
};

function ReactionIcon({ glyph, size = 14 }: { glyph: ReactionGlyph; size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      {glyph === "sticker" && <><path d="M20 13V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8Z" /><path d="M14 21v-6a2 2 0 0 1 2-2h6" /></>}
      {glyph === "media" && <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m10 9 5 3-5 3V9Z" /></>}
      {glyph === "bookmark" && <path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4V4.5Z" />}
    </svg>
  );
}

function isReaction(value: unknown): value is Reaction {
  if (!value || typeof value !== "object") return false;
  const reaction = value as Partial<Reaction>;
  return typeof reaction.emoji === "string" && typeof reaction.count === "number" && typeof reaction.reactedByMe === "boolean";
}

function isMessage(value: unknown): value is Message {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<Message>;
  return (
    typeof message.id === "string" &&
    typeof message.content === "string" &&
    (message.kind === "TEXT" || message.kind === "STICKER" || message.kind === "GIF") &&
    (message.mediaKey === null || typeof message.mediaKey === "string") &&
    (message.mediaUrl === null || typeof message.mediaUrl === "string") &&
    typeof message.createdAt === "string" &&
    !!message.author &&
    typeof message.author.id === "string" &&
    typeof message.author.name === "string" &&
    typeof message.author.nickname === "string" &&
    (message.author.avatarUrl === null || typeof message.author.avatarUrl === "string") &&
    typeof message.author.role === "string" &&
    Array.isArray(message.reactions) && message.reactions.every(isReaction)
  );
}

function isSavedSticker(value: unknown): value is SavedSticker {
  if (!value || typeof value !== "object") return false;
  const sticker = value as Partial<SavedSticker>;
  return typeof sticker.id === "string" && typeof sticker.key === "string" &&
    (sticker.stickerKey === null || typeof sticker.stickerKey === "string") &&
    (sticker.mediaUrl === null || typeof sticker.mediaUrl === "string") &&
    typeof sticker.label === "string" && typeof sticker.createdAt === "string";
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [savedStickers, setSavedStickers] = useState<SavedSticker[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyMessageId, setBusyMessageId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [menu, setMenu] = useState<MessageMenu>(null);
  const [reactionPicker, setReactionPicker] = useState<ReactionPicker>(null);
  const [emojiSearch, setEmojiSearch] = useState("");
  const [emojiCategory, setEmojiCategory] = useState<ReactionCategory>("all");
  const [composerEmojiOpen, setComposerEmojiOpen] = useState(false);
  const [mediaPicker, setMediaPicker] = useState<MediaPicker>(null);
  const [stickerTab, setStickerTab] = useState<"SAVED" | "MIVO">("MIVO");
  const loadingRef = useRef(false);
  const reactionVersionRef = useRef(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const reactionPickerRef = useRef<HTMLDivElement>(null);
  const reactionAnchorRef = useRef<HTMLElement | null>(null);
  const longPressStartRef = useRef<LongPressStart | null>(null);
  const longPressTimerRef = useRef<number | undefined>(undefined);
  const suppressContextMenuRef = useRef(false);
  const gifFileRef = useRef<HTMLInputElement>(null);
  const stickerFileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (loadingRef.current || document.visibilityState !== "visible") return;
    loadingRef.current = true;
    const reactionVersionAtStart = reactionVersionRef.current;
    try {
      const response = await fetch("/api/chat", { cache: "no-store" });
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      const data: unknown = await response.json();
      if (response.ok) {
        const payload = data as { messages?: unknown; currentUserId?: unknown; savedStickers?: unknown };
        if (!Array.isArray(payload.messages)) {
          throw new Error("Chat returned an unexpected response. Refresh the page and try again.");
        }
        const refreshedMessages = payload.messages.filter(isMessage);
        setMessages((current) => {
          const currentById = new Map(current.map((message) => [message.id, message]));
          return refreshedMessages.map((message) => {
            const currentMessage = currentById.get(message.id);
            // An older polling response must not overwrite a reaction the member just made.
            return reactionVersionRef.current !== reactionVersionAtStart && currentMessage
              ? { ...message, reactions: currentMessage.reactions }
              : message;
          });
        });
        setSavedStickers(Array.isArray(payload.savedStickers) ? payload.savedStickers.filter(isSavedSticker) : []);
        setCurrentUserId(typeof payload.currentUserId === "string" ? payload.currentUserId : null);
        setError("");
      } else {
        const payload = data as { error?: unknown };
        setError(typeof payload.error === "string" ? payload.error : "Chat is unavailable.");
      }
    } catch {
      setError("Chat is unavailable. Check your connection and try again.");
    } finally {
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(load, 15000);
    const refreshOnFocus = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", refreshOnFocus);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshOnFocus);
    };
  }, [load]);

  useEffect(() => {
    if (!menu) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenu(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(null);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menu]);

  useEffect(() => {
    if (!reactionPicker) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!reactionPickerRef.current?.contains(target) && !reactionAnchorRef.current?.contains(target)) {
        setReactionPicker(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setReactionPicker(null);
    };
    const closeOnPageScroll = (event: Event) => {
      if (reactionPickerRef.current?.contains(event.target as Node)) return;
      setReactionPicker(null);
    };
    const closeOnResize = () => setReactionPicker(null);
    let closeTimer: number | undefined;
    const closeWhenPointerLeaves = (event: PointerEvent) => {
      const target = event.target as Node;
      if (reactionPickerRef.current?.contains(target) || reactionAnchorRef.current?.contains(target)) {
        if (closeTimer !== undefined) window.clearTimeout(closeTimer);
        closeTimer = undefined;
        return;
      }
      if (closeTimer === undefined) {
        closeTimer = window.setTimeout(() => setReactionPicker(null), 160);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("scroll", closeOnPageScroll, true);
    document.addEventListener("pointermove", closeWhenPointerLeaves);
    window.addEventListener("resize", closeOnResize);
    return () => {
      if (closeTimer !== undefined) window.clearTimeout(closeTimer);
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("scroll", closeOnPageScroll, true);
      document.removeEventListener("pointermove", closeWhenPointerLeaves);
      window.removeEventListener("resize", closeOnResize);
    };
  }, [reactionPicker]);

  function openMenu(event: MouseEvent<HTMLElement>, messageId: string) {
    event.preventDefault();
    const menuWidth = 160;
    const menuHeight = 112;
    setMenu({
      id: messageId,
      x: Math.max(8, Math.min(event.clientX, window.innerWidth - menuWidth - 8)),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - menuHeight - 8)),
    });
  }

  function showReactionPicker(messageId: string, anchor: HTMLElement) {
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(344, Math.max(0, window.innerWidth - 16));
    const height = Math.min(390, window.innerHeight - 16);
    const left = Math.max(8, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 8));
    const top = rect.top >= height + 8
      ? Math.max(8, rect.top - height - 8)
      : Math.max(8, Math.min(rect.bottom + 8, window.innerHeight - height - 8));
    setEmojiSearch("");
    setEmojiCategory("all");
    setMenu(null);
    reactionAnchorRef.current = anchor;
    setReactionPicker({ messageId, left, top, width });
  }

  function clearLongPress(pointerId?: number) {
    if (pointerId !== undefined && longPressStartRef.current?.pointerId !== pointerId) return;
    if (longPressTimerRef.current !== undefined) window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = undefined;
    longPressStartRef.current = null;
  }

  function beginMessageLongPress(event: ReactPointerEvent<HTMLElement>, messageId: string) {
    if (event.button !== 0 || (event.target instanceof Element && event.target.closest("button, a, input, textarea"))) return;
    clearLongPress();
    const start: LongPressStart = {
      pointerId: event.pointerId,
      messageId,
      x: event.clientX,
      y: event.clientY,
      anchor: event.currentTarget,
    };
    longPressStartRef.current = start;
    longPressTimerRef.current = window.setTimeout(() => {
      if (longPressStartRef.current !== start) return;
      longPressTimerRef.current = undefined;
      longPressStartRef.current = null;
      suppressContextMenuRef.current = true;
      window.setTimeout(() => { suppressContextMenuRef.current = false; }, 900);
      showReactionPicker(messageId, start.anchor);
    }, 520);
  }

  function moveMessageLongPress(event: ReactPointerEvent<HTMLElement>) {
    const start = longPressStartRef.current;
    if (!start || start.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12) clearLongPress(event.pointerId);
  }

  function handleMessageContextMenu(event: MouseEvent<HTMLElement>, messageId: string, isOwnMessage: boolean) {
    event.preventDefault();
    if (suppressContextMenuRef.current) return;
    if (isOwnMessage) openMenu(event, messageId);
    else showReactionPicker(messageId, event.currentTarget);
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!content.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const payload = (await response.json()) as { error?: unknown; message?: unknown };
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok) {
        throw new Error(typeof payload.error === "string" ? payload.error : "Unable to send message.");
      }
      const newMessage = payload.message;
      if (!isMessage(newMessage)) throw new Error("Chat did not confirm the message. Refresh and try again.");
      setMessages((current) => [...current, newMessage].slice(-80));
      setContent("");
      setMediaPicker(null);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send message.");
    } finally {
      setBusy(false);
    }
  }

  async function sendMedia(kind: "STICKER" | "GIF", media: { mediaKey?: string; mediaUrl?: string }) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, ...media }),
      });
      const payload = (await response.json()) as { error?: unknown; message?: unknown };
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok) {
        throw new Error(typeof payload.error === "string" ? payload.error : `Unable to send ${kind.toLowerCase()}.`);
      }
      if (!isMessage(payload.message)) throw new Error("Chat did not confirm the media message. Refresh and try again.");
      setMessages((current) => [...current, payload.message as Message].slice(-80));
      setMediaPicker(null);
    } catch (mediaError) {
      setError(mediaError instanceof Error ? mediaError.message : `Unable to send ${kind.toLowerCase()}.`);
    } finally {
      setBusy(false);
    }
  }

  async function uploadGif(file: File | undefined) {
    if (!file || busy) return;
    setBusy(true);
    setError("");
    try {
      const uploadForm = new FormData();
      uploadForm.append("file", file);
      uploadForm.append("kind", "GIF");
      const uploadResponse = await fetch("/api/chat/media", { method: "POST", body: uploadForm });
      const uploadPayload = (await uploadResponse.json()) as { error?: unknown; url?: unknown };
      if (uploadResponse.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!uploadResponse.ok || typeof uploadPayload.url !== "string") {
        throw new Error(typeof uploadPayload.error === "string" ? uploadPayload.error : "Unable to upload GIF.");
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "GIF", mediaUrl: uploadPayload.url }),
      });
      const payload = (await response.json()) as { error?: unknown; message?: unknown };
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok) {
        throw new Error(typeof payload.error === "string" ? payload.error : "Unable to send GIF.");
      }
      if (!isMessage(payload.message)) throw new Error("Chat did not confirm the GIF. Refresh and try again.");
      setMessages((current) => [...current, payload.message as Message].slice(-80));
      setMediaPicker(null);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to send GIF.");
    } finally {
      setBusy(false);
      if (gifFileRef.current) gifFileRef.current.value = "";
    }
  }

  async function uploadSticker(file: File | undefined) {
    if (!file || busy) return;
    setBusy(true);
    setError("");
    try {
      const uploadForm = new FormData();
      uploadForm.append("file", file);
      uploadForm.append("kind", "STICKER");
      const uploadResponse = await fetch("/api/chat/media", { method: "POST", body: uploadForm });
      const uploadPayload = (await uploadResponse.json()) as { error?: unknown; url?: unknown };
      if (uploadResponse.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!uploadResponse.ok || typeof uploadPayload.url !== "string") {
        throw new Error(typeof uploadPayload.error === "string" ? uploadPayload.error : "Unable to add sticker.");
      }

      const response = await fetch("/api/chat/stickers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaUrl: uploadPayload.url }),
      });
      const payload = (await response.json()) as { error?: unknown; sticker?: unknown };
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok || !isSavedSticker(payload.sticker)) {
        throw new Error(typeof payload.error === "string" ? payload.error : "Unable to save sticker.");
      }
      setSavedStickers((current) => [payload.sticker as SavedSticker, ...current.filter((sticker) => sticker.key !== (payload.sticker as SavedSticker).key)]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to add sticker.");
    } finally {
      setBusy(false);
      if (stickerFileRef.current) stickerFileRef.current.value = "";
    }
  }

  async function toggleSavedSticker(sticker: { stickerKey?: string; mediaUrl?: string }) {
    const key = sticker.stickerKey ? `catalog:${sticker.stickerKey}` : `url:${sticker.mediaUrl}`;
    const isSaved = savedStickers.some((saved) => saved.key === key);
    try {
      const response = await fetch("/api/chat/stickers", {
        method: isSaved ? "DELETE" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sticker),
      });
      const payload = (await response.json()) as { error?: unknown; sticker?: unknown };
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Unable to update saved stickers.");
      if (isSaved) {
        setSavedStickers((current) => current.filter((saved) => saved.key !== key));
      } else if (isSavedSticker(payload.sticker)) {
        setSavedStickers((current) => [payload.sticker as SavedSticker, ...current.filter((saved) => saved.key !== key)]);
      }
    } catch (stickerError) {
      setError(stickerError instanceof Error ? stickerError.message : "Unable to update saved stickers.");
    }
  }

  async function reactToMessage(message: Message, emoji: string) {
    if (busyMessageId) return;
    const removing = message.reactions.some((reaction) => reaction.emoji === emoji && reaction.reactedByMe);
    setBusyMessageId(message.id);
    setError("");
    try {
      const response = await fetch("/api/chat", {
        method: removing ? "DELETE" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(removing ? { action: "REACTION" } : {}), id: message.id, emoji }),
      });
      const payload = (await response.json()) as { error?: unknown; reactions?: unknown };
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok) {
        throw new Error(typeof payload.error === "string" ? payload.error : "Unable to update reaction.");
      }
      if (!Array.isArray(payload.reactions) || !payload.reactions.every(isReaction)) {
        throw new Error("Chat did not confirm the reaction. Refresh and try again.");
      }
      const reactions = payload.reactions as Reaction[];
      reactionVersionRef.current += 1;
      setMessages((current) => current.map((item) => item.id === message.id ? { ...item, reactions } : item));
      setReactionPicker(null);
    } catch (reactionError) {
      setError(reactionError instanceof Error ? reactionError.message : "Unable to update reaction.");
    } finally {
      setBusyMessageId(null);
    }
  }

  function beginEdit(message: Message) {
    if (message.kind !== "TEXT") return;
    setEditingId(message.id);
    setEditingContent(message.content);
    setMenu(null);
    setError("");
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>, messageId: string) {
    event.preventDefault();
    const nextContent = editingContent.trim();
    if (!nextContent || nextContent.length > 1500 || busyMessageId) return;
    setBusyMessageId(messageId);
    setError("");
    try {
      const response = await fetch("/api/chat", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: messageId, content: nextContent }),
      });
      const payload = (await response.json()) as { error?: unknown; message?: unknown };
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok) {
        throw new Error(typeof payload.error === "string" ? payload.error : "Unable to edit message.");
      }
      if (!isMessage(payload.message)) throw new Error("Chat did not confirm the edit. Refresh and try again.");
      const updatedMessage = payload.message;
      setMessages((current) => current.map((message) => message.id === messageId ? updatedMessage : message));
      setEditingId(null);
      setEditingContent("");
    } catch (editError) {
      setError(editError instanceof Error ? editError.message : "Unable to edit message.");
    } finally {
      setBusyMessageId(null);
    }
  }

  async function deleteMessage(messageId: string) {
    if (busyMessageId) return;
    setBusyMessageId(messageId);
    setMenu(null);
    setError("");
    try {
      const response = await fetch("/api/chat", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: messageId }),
      });
      const payload = (await response.json()) as { error?: unknown };
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok) {
        throw new Error(typeof payload.error === "string" ? payload.error : "Unable to delete message.");
      }
      setMessages((current) => current.filter((message) => message.id !== messageId));
      if (editingId === messageId) {
        setEditingId(null);
        setEditingContent("");
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete message.");
    } finally {
      setBusyMessageId(null);
    }
  }

  const normalizedEmojiSearch = emojiSearch.trim().toLowerCase();
  const activeCategoryEmojis: readonly string[] = REACTION_CATEGORIES[emojiCategory];
  const visibleEmojiOptions = REACTION_OPTIONS.filter((option) => {
    const searchContent = `${option.label} ${option.emoji} ${REACTION_SEARCH_TERMS[option.emoji] ?? ""}`.toLowerCase();
    return activeCategoryEmojis.includes(option.emoji) && (!normalizedEmojiSearch || searchContent.includes(normalizedEmojiSearch));
  });

  return (
    <main className="chat-page text-foreground">
      <div className="chat-layout">
        <aside className="chat-room-list" aria-label="Conversations">
          <div className="chat-room-list-heading"><h2>Chats</h2><span className="text-[10px] text-muted">MIVO</span></div>
          <Link href="/chat" className="chat-room-item" aria-current="page">
            <span className="chat-room-avatar">MT</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">Mivo Traders</span>
              <span className="chat-room-preview mt-1 block">Shared market conversation</span>
            </span>
          </Link>
          <div className="mt-auto border-t border-border p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Group chat</p>
            <p className="mt-2 text-xs leading-5 text-muted">Discuss markets and trade ideas with the Mivo community.</p>
            <Link href="/community" className="mt-4 inline-flex text-xs font-semibold text-accent hover:underline">Open community feed</Link>
          </div>
        </aside>

        <section className="chat-conversation" aria-label="Mivo Traders group conversation">
          <header className="chat-room-header">
            <span className="chat-room-avatar">MT</span>
            <div className="chat-room-header-copy">
              <h1>Mivo Traders</h1>
              <p>Shared group · Market talk and trade ideas</p>
            </div>
            <Link href="/community" aria-label="Open community feed" title="Open community feed" className="rounded-md px-3 py-2 text-xs font-semibold text-muted transition hover:bg-surface-raised hover:text-foreground">Community</Link>
          </header>

          <section
            className="chat-messages"
          aria-label="Chat messages"
          aria-live="polite"
        >
          {messages.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">The room is quiet. Start the conversation.</p>
          ) : (
            messages.map((message) => {
              const isOwnMessage = message.author.id === currentUserId;
              const isEditing = editingId === message.id;
              const isMessageBusy = busyMessageId === message.id;
              const stickerSaveKey = message.kind === "STICKER"
                ? message.mediaUrl ? `url:${message.mediaUrl}` : `catalog:${message.mediaKey}`
                : null;
              const stickerIsSaved = stickerSaveKey ? savedStickers.some((sticker) => sticker.key === stickerSaveKey) : false;
              return (
                  <div className={`chat-message-row${isOwnMessage ? " is-own" : ""}`} key={message.id}>
                    {!isOwnMessage && <MemberAvatar name={message.author.nickname} imageUrl={message.author.avatarUrl} size={27} className="chat-message-avatar" />}
                  <article
                  onPointerDown={(event) => beginMessageLongPress(event, message.id)}
                  onPointerMove={moveMessageLongPress}
                  onPointerUp={(event) => clearLongPress(event.pointerId)}
                  onPointerCancel={(event) => clearLongPress(event.pointerId)}
                  onPointerLeave={(event) => clearLongPress(event.pointerId)}
                  onContextMenu={(event) => handleMessageContextMenu(event, message.id, isOwnMessage)}
                    className="chat-message-bubble group"
                >
                  <div className="chat-message-head">
                      {!isOwnMessage && <span className="chat-message-author">{message.author.nickname}</span>}
                      {message.author.role === "ADMIN" && !isOwnMessage && <span className="text-[9px] text-muted">Mivo team</span>}
                      <time className="chat-message-time">
                        {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </time>
                    <button
                      type="button"
                      onClick={(event) => showReactionPicker(message.id, event.currentTarget)}
                      disabled={isMessageBusy}
                      aria-label={`React to ${message.author.nickname}'s message`}
                      className="sr-only focus:not-sr-only focus:rounded focus:bg-background focus:px-2 focus:py-1 focus:text-xs"
                    >
                      React
                    </button>
                    {isOwnMessage && !isEditing && (
                      <button
                        type="button"
                        onClick={(event) => openMenu(event, message.id)}
                        disabled={isMessageBusy}
                        aria-label="Message options"
                        aria-haspopup="menu"
                        className="rounded-md px-1.5 py-0.5 text-muted transition hover:bg-background hover:text-foreground"
                      >
                        <span aria-hidden="true">•••</span>
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <form onSubmit={(event) => void saveEdit(event, message.id)} className="mt-2">
                      <textarea
                        autoFocus
                        value={editingContent}
                        onChange={(event) => setEditingContent(event.target.value)}
                        maxLength={1500}
                        rows={Math.min(5, Math.max(2, editingContent.split("\n").length))}
                        aria-label="Edit your message"
                        className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                      />
                      <div className="mt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => { setEditingId(null); setEditingContent(""); }}
                          className="rounded-lg px-3 py-1.5 text-xs text-muted hover:bg-background hover:text-foreground"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={!editingContent.trim() || isMessageBusy}
                          className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background disabled:opacity-50"
                        >
                          {isMessageBusy ? "Saving…" : "Save"}
                        </button>
                      </div>
                    </form>
                  ) : message.kind === "STICKER" ? (
                    message.mediaUrl ? (
                      <div className="chat-sticker-message chat-sticker-uploaded mt-2" role="img" aria-label="Uploaded chat sticker">
                        <Image src={message.mediaUrl} alt="Sticker sent in trader chat" width={240} height={240} unoptimized className="max-h-24 max-w-full object-contain" />
                      </div>
                    ) : (() => {
                      const sticker = CHAT_STICKERS.find((item) => item.key === message.mediaKey) ?? CHAT_STICKERS[0];
                      return <div className="chat-sticker-message mt-2" role="img" aria-label={`Sticker: ${sticker.label}`}>
                        <span className="chat-sticker-art chat-sticker-art-message" aria-hidden="true">{sticker.emoji}</span>
                      </div>;
                    })()
                  ) : message.kind === "GIF" ? (
                    message.mediaUrl ? (
                      <div className="chat-gif-message chat-gif-uploaded mt-2">
                        <span className="chat-gif-badge">GIF</span>
                        <Image src={message.mediaUrl} alt="GIF sent in trader chat" width={360} height={240} unoptimized className="max-h-32 max-w-[200px] rounded-md object-contain" />
                      </div>
                    ) : (() => {
                      const gif = GIFS.find((item) => item.key === message.mediaKey) ?? GIFS[0];
                      return (
                        <div className={`chat-gif-message chat-gif-${gif.key} mt-2`} role="img" aria-label={`Animated GIF: ${gif.label}`}>
                          <span className="chat-gif-badge">GIF</span>
                          <ReactionIcon glyph="media" size={28} />
                          <span className="chat-media-caption">{gif.label}</span>
                        </div>
                      );
                    })()
                  ) : (
                      <p className="chat-message-text">{message.content}</p>
                  )}

                  {message.kind === "STICKER" && (
                    <button
                      type="button"
                      onClick={() => void toggleSavedSticker(message.mediaUrl ? { mediaUrl: message.mediaUrl } : { stickerKey: message.mediaKey ?? undefined })}
                      aria-pressed={stickerIsSaved}
                      title={stickerIsSaved ? "Remove saved sticker" : "Save sticker"}
                      aria-label={stickerIsSaved ? "Remove saved sticker" : "Save sticker"}
                      className="mt-1 inline-grid h-6 w-6 place-items-center rounded-full text-xs text-muted transition hover:bg-surface-raised hover:text-foreground"
                    >
                      <ReactionIcon glyph="bookmark" size={12} />
                    </button>
                  )}
                  </article>
                  </div>
              );
            })
          )}
        </section>

        {reactionPicker && typeof document !== "undefined" && createPortal(
          <div
            ref={reactionPickerRef}
            className="fixed z-[100] max-w-[calc(100vw-1rem)] rounded-xl border border-border bg-surface text-foreground shadow-2xl chat-emoji-picker-expanded"
            style={{ left: reactionPicker.left, top: reactionPicker.top, width: reactionPicker.width }}
            role="dialog"
            aria-label="Choose an emoji reaction"
          >
            <div className="chat-emoji-picker-content">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div><p className="text-xs font-semibold">Choose a reaction</p><p className="mt-0.5 text-[10px] text-muted">Emoji</p></div>
                <button type="button" onClick={() => setReactionPicker(null)} className="rounded-md px-2 py-1 text-sm text-muted hover:bg-surface-raised" aria-label="Close emoji picker">×</button>
              </div>
              <div className="chat-emoji-picker-quick" aria-label="Quick reactions">
                {QUICK_REACTIONS.map((option) => {
                  const message = messages.find((item) => item.id === reactionPicker.messageId);
                  const reaction = message?.reactions.find((item) => item.emoji === option.emoji);
                  return (
                    <button
                      key={option.emoji}
                      type="button"
                      onClick={() => { if (message) void reactToMessage(message, option.emoji); }}
                      disabled={busyMessageId === reactionPicker.messageId}
                      aria-pressed={reaction?.reactedByMe ?? false}
                      aria-label={`${option.label}${reaction ? `, ${reaction.count} reactions` : ""}`}
                      title={option.label}
                    >
                      {option.emoji}
                    </button>
                  );
                })}
              </div>
              <input value={emojiSearch} onChange={(event) => setEmojiSearch(event.target.value)} placeholder="Search emoji" aria-label="Search emoji" className="mb-2 w-full rounded-md border border-border bg-background px-3 py-2 text-xs outline-none focus:border-accent" />
              <div className="chat-emoji-category-tabs" role="tablist" aria-label="Emoji categories">
                {(Object.keys(REACTION_CATEGORIES) as ReactionCategory[]).map((category) => (
                  <button key={category} type="button" role="tab" aria-selected={emojiCategory === category} onClick={() => setEmojiCategory(category)} className={emojiCategory === category ? "is-active" : ""}>{REACTION_CATEGORY_LABELS[category]}</button>
                ))}
              </div>
              <div className="chat-emoji-picker-grid">
                {visibleEmojiOptions.map((option) => {
                  const message = messages.find((item) => item.id === reactionPicker.messageId);
                  const reaction = message?.reactions.find((item) => item.emoji === option.emoji);
                  return (
                    <button
                      key={option.emoji}
                      type="button"
                      onClick={() => { if (message) void reactToMessage(message, option.emoji); }}
                      disabled={busyMessageId === reactionPicker.messageId}
                      aria-pressed={reaction?.reactedByMe ?? false}
                      aria-label={`React with ${option.label}${reaction ? `, ${reaction.count} reactions` : ""}`}
                      title={option.label}
                      className={`chat-picker-emoji-button${reaction?.reactedByMe ? " is-selected" : ""}`}
                    >
                      <span aria-hidden="true">{option.emoji}</span>
                      {reaction && <small aria-hidden="true">{reaction.count}</small>}
                    </button>
                  );
                })}
                {!visibleEmojiOptions.length && <p className="col-span-full px-2 py-4 text-center text-xs text-muted">No matching emoji.</p>}
              </div>
            </div>
          </div>,
          document.body,
        )}

        {menu && (
          <div
            ref={menuRef}
            role="menu"
            aria-label="Message options"
            style={{ left: menu.x, top: menu.y }}
            className="fixed z-50 min-w-40 rounded-lg border border-border bg-background p-1 shadow-xl"
          >
            {messages.find((item) => item.id === menu.id)?.kind === "TEXT" && <button
              type="button"
              role="menuitem"
              onClick={() => {
                const message = messages.find((item) => item.id === menu.id);
                if (message) beginEdit(message);
              }}
              className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-surface"
            >
              Edit message
            </button>}
            <button
              type="button"
              role="menuitem"
              disabled={busyMessageId === menu.id}
              onClick={() => void deleteMessage(menu.id)}
              className="block w-full rounded-md px-3 py-2 text-left text-sm text-red-400 hover:bg-surface disabled:opacity-50"
            >
              Delete message
            </button>
          </div>
        )}

        <div className="chat-composer-wrap">
        {mediaPicker && (
          <section className="chat-media-picker mb-3 rounded-xl border border-border bg-surface p-3" aria-label={mediaPicker === "STICKER" ? "Sticker picker" : "GIF picker"}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold">{mediaPicker === "STICKER" ? "Stickers" : "Animated GIFs"}</p>
                <p className="mt-0.5 text-xs text-muted">{mediaPicker === "STICKER" ? "Save favorites or add your own image stickers" : "Send a real GIF file or reuse one from this room"}</p>
              </div>
              <button type="button" onClick={() => setMediaPicker(null)} className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-background" aria-label="Close media picker">✕</button>
            </div>
            {mediaPicker === "STICKER" ? (
              <>
                <div className="chat-sticker-tabs" role="tablist" aria-label="Sticker packs">
                  <button type="button" role="tab" aria-selected={stickerTab === "SAVED"} onClick={() => setStickerTab("SAVED")} className={stickerTab === "SAVED" ? "is-active" : ""}>Saved <span>{savedStickers.length}</span></button>
                  <button type="button" role="tab" aria-selected={stickerTab === "MIVO"} onClick={() => setStickerTab("MIVO")} className={stickerTab === "MIVO" ? "is-active" : ""}>Mivo pack</button>
                </div>
                {stickerTab === "SAVED" ? (
                  savedStickers.length ? (
                    <div className="chat-sticker-grid" role="tabpanel" aria-label="Your saved stickers">
                      {savedStickers.map((sticker) => {
                        const catalogSticker = CHAT_STICKERS.find((item) => item.key === sticker.stickerKey);
                        return <div key={sticker.id} className="chat-sticker-tile">
                          <button type="button" onClick={() => void sendMedia("STICKER", sticker.mediaUrl ? { mediaUrl: sticker.mediaUrl } : { mediaKey: sticker.stickerKey ?? undefined })} disabled={busy} aria-label={`Send saved sticker: ${sticker.label}`} title={sticker.label}>
                            {sticker.mediaUrl ? <Image src={sticker.mediaUrl} alt="" width={96} height={96} unoptimized className="h-14 w-14 object-contain" /> : <span className="chat-sticker-art">{catalogSticker?.emoji ?? "✨"}</span>}
                          </button>
                          <button type="button" onClick={() => void toggleSavedSticker(sticker.stickerKey ? { stickerKey: sticker.stickerKey } : { mediaUrl: sticker.mediaUrl ?? undefined })} aria-label={`Remove ${sticker.label} from saved stickers`} className="chat-sticker-save is-saved"><ReactionIcon glyph="bookmark" size={11} /></button>
                        </div>;
                      })}
                    </div>
                  ) : <p className="chat-sticker-empty" role="tabpanel">Save a sticker from a message or the Mivo pack to keep it here.</p>
                ) : (
                  <div className="chat-sticker-grid" role="tabpanel" aria-label="Mivo sticker pack">
                    {CHAT_STICKERS.map((sticker) => {
                      const isSaved = savedStickers.some((item) => item.key === `catalog:${sticker.key}`);
                      return <div key={sticker.key} className="chat-sticker-tile">
                        <button type="button" onClick={() => void sendMedia("STICKER", { mediaKey: sticker.key })} disabled={busy} aria-label={`Send ${sticker.label} sticker`} title={sticker.label}>
                          <span className="chat-sticker-art">{sticker.emoji}</span>
                        </button>
                        <button type="button" onClick={() => void toggleSavedSticker({ stickerKey: sticker.key })} aria-label={`${isSaved ? "Remove" : "Save"} ${sticker.label}`} aria-pressed={isSaved} className={`chat-sticker-save ${isSaved ? "is-saved" : ""}`}><ReactionIcon glyph="bookmark" size={11} /></button>
                      </div>;
                    })}
                  </div>
                )}
                <div className="mt-3 border-t border-border pt-3">
                  <input ref={stickerFileRef} type="file" accept="image/gif,image/png,image/jpeg,image/webp,.gif,.png,.jpg,.jpeg,.webp" className="sr-only" aria-label="Choose a sticker image" onChange={(event) => void uploadSticker(event.target.files?.[0])} />
                  <button type="button" onClick={() => stickerFileRef.current?.click()} disabled={busy} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted transition hover:border-accent/50 hover:text-foreground disabled:opacity-50">
                    {busy ? "Adding sticker…" : "Add sticker from device"}
                  </button>
                  <span className="ml-2 text-xs text-muted">GIF, PNG, JPG, or WEBP · up to 4 MB</span>
                </div>
              </>
            ) : (
              <>
                <input ref={gifFileRef} type="file" accept="image/gif,.gif" className="sr-only" aria-label="Choose a GIF file" onChange={(event) => void uploadGif(event.target.files?.[0])} />
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => gifFileRef.current?.click()} disabled={busy} className="rounded-lg bg-accent px-3 py-2 text-xs font-bold text-accent-foreground transition hover:opacity-90 disabled:opacity-50">
                    {busy ? "Uploading GIF…" : "Choose a GIF file"}
                  </button>
                  <span className="text-xs text-muted">Animated GIF only · up to 4 MB</span>
                </div>
                <p className="mb-2 mt-4 text-xs font-bold uppercase tracking-wider text-muted">Recently shared GIFs</p>
                {messages.some((message) => message.kind === "GIF" && message.mediaUrl) ? (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {messages.filter((message) => message.kind === "GIF" && message.mediaUrl).slice(-12).reverse().map((message) => (
                      <button key={message.id} type="button" onClick={() => void sendMedia("GIF", { mediaUrl: message.mediaUrl ?? undefined })} disabled={busy} className="grid h-20 w-28 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-background p-1 hover:border-accent/50 disabled:opacity-50" aria-label="Send this GIF again">
                        <Image src={message.mediaUrl!} alt="" width={112} height={72} unoptimized className="max-h-[72px] max-w-full rounded object-contain" />
                      </button>
                    ))}
                  </div>
                ) : <p className="rounded-lg bg-background px-3 py-2 text-xs text-muted">No GIFs have been shared yet. Choose a real GIF file to add the first one.</p>}
              </>
            )}
          </section>
        )}

        {error && <p role="status" className="mb-3 text-sm text-red-400">{error}</p>}
        {composerEmojiOpen && <div className="chat-composer-emoji-list" role="group" aria-label="Insert an emoji">
          {NAMED_REACTION_OPTIONS.map((option) => <button key={option.emoji} type="button" onClick={() => { setContent((current) => current + option.emoji); setComposerEmojiOpen(false); }} aria-label={`Insert ${option.label}`} title={option.label} className="chat-composer-emoji">{option.emoji}</button>)}
        </div>}
        <form onSubmit={(event) => void send(event)} className="chat-composer">
          <button type="button" onClick={() => setComposerEmojiOpen((open) => !open)} aria-label="Add emoji" aria-expanded={composerEmojiOpen} className="chat-composer-action">
            <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M8 14.5s1.3 2 4 2 4-2 4-2M9 9.5h.01M15 9.5h.01" /></svg>
          </button>
          <button type="button" onClick={() => setMediaPicker((current) => current === "STICKER" ? null : "STICKER")} aria-expanded={mediaPicker === "STICKER"} aria-label="Choose a sticker" className={`chat-composer-action ${mediaPicker === "STICKER" ? "text-accent" : ""}`}><ReactionIcon glyph="sticker" size={16} /><span className="hidden sm:inline">Sticker</span></button>
          <button type="button" onClick={() => setMediaPicker((current) => current === "GIF" ? null : "GIF")} aria-expanded={mediaPicker === "GIF"} aria-label="Choose a GIF" className={`chat-composer-action ${mediaPicker === "GIF" ? "text-accent" : ""}`}>GIF</button>
          <input
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={1500}
            placeholder="Message the group"
            aria-label="Message the Mivo Traders group"
            className="chat-composer-input"
          />
          <button type="submit" disabled={busy || !content.trim()} aria-label="Send message" title="Send message" className="chat-send-button">
            <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m21 3-7.1 18-3.3-7.6L3 10.1 21 3Z" /><path d="M10.6 13.4 21 3" /></svg>
          </button>
        </form>
        <p className="mt-2 text-right text-[10px] text-muted">Messages refresh while this group is open.</p>
        </div>
        </section>
      </div>
    </main>
  );
}
