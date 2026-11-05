import { containsExternalLink } from "@/lib/community-moderation";

const MEMBER_CATEGORIES = ["Market Analysis", "Discussion"] as const;

export type CommunityPostDraft = {
  title: string;
  content: string;
  category: (typeof MEMBER_CATEGORIES)[number];
  imageUrl: string | null;
  tradingViewUrl: string | null;
};

type ParseCommunityPostResult =
  | { ok: true; draft: CommunityPostDraft }
  | { ok: false; error: string };

function validateChartScreenshot(value: unknown, userId: string) {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || value.length > 2048) return undefined;

  try {
    const url = new URL(value);
    const decodedPath = decodeURIComponent(url.pathname);
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const belongsToMember = decodedPath.includes(`/mivo-capital/member-uploads/${userId}/`);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "res.cloudinary.com" ||
      url.username ||
      url.password ||
      !cloudName ||
      decodedPath.split("/")[1] !== cloudName ||
      !decodedPath.includes("/image/upload/") ||
      !belongsToMember
    ) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function validateTradingViewUrl(value: unknown) {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || value.length > 2048) return undefined;

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const isTradingView = host === "tradingview.com" || host === "www.tradingview.com";
    const isSharedChart = /^\/(?:chart|x)\//.test(url.pathname);
    if (url.protocol !== "https:" || !isTradingView || !isSharedChart || url.username || url.password) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

export function parseCommunityPostDraft(body: unknown, userId: string): ParseCommunityPostResult {
  const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const content = typeof input.content === "string" ? input.content.trim() : "";
  const suppliedTitle = typeof input.title === "string" ? input.title.trim() : "";
  const category = typeof input.category === "string" ? input.category.trim() : "Discussion";
  const imageUrl = validateChartScreenshot(input.imageUrl, userId);
  const tradingViewUrl = validateTradingViewUrl(input.tradingViewUrl);

  if (!content || content.length > 3000) return { ok: false, error: "Write a post of up to 3,000 characters." };
  if (suppliedTitle.length > 120) return { ok: false, error: "Titles can be up to 120 characters." };
  if (!(MEMBER_CATEGORIES as readonly string[]).includes(category)) {
    return { ok: false, error: "Members can post only Market Analysis or Discussion." };
  }
  if (containsExternalLink(`${suppliedTitle}\n${content}`)) {
    return {
      ok: false,
      error: "External links are not allowed in post text. Add a screenshot or use the TradingView chart link field.",
    };
  }
  if (imageUrl === undefined) return { ok: false, error: "Choose a screenshot uploaded to your Mivo account." };
  if (tradingViewUrl === undefined) return { ok: false, error: "Use a secure TradingView chart link." };

  const firstLine = content.split(/\r?\n/).find((line) => line.trim()) || content;
  return {
    ok: true,
    draft: {
      title: suppliedTitle || firstLine.slice(0, 120),
      content,
      category: category as CommunityPostDraft["category"],
      imageUrl,
      tradingViewUrl,
    },
  };
}
