// Client social profiles. A client may have several per network.
export const SOCIAL_PLATFORMS = ["instagram", "tiktok", "facebook", "youtube", "linkedin", "x", "other"] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];
export type Social = { platform: SocialPlatform; handle: string };

export const SOCIAL_LABEL: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  x: "X",
  other: "Other",
};

export function parseSocials(value: unknown): Social[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((s) => ({
      platform: (SOCIAL_PLATFORMS as readonly string[]).includes(s?.platform) ? (s.platform as SocialPlatform) : "other",
      handle: String(s?.handle ?? "").trim(),
    }))
    .filter((s) => s.handle)
    .slice(0, 20);
}

/** "@nolimitgym" → "https://instagram.com/nolimitgym"; full URLs are kept as they are. */
export function socialUrl({ platform, handle }: Social): string {
  if (/^https?:\/\//i.test(handle)) return handle;
  const h = handle.replace(/^@/, "");
  switch (platform) {
    case "instagram":
      return `https://instagram.com/${h}`;
    case "tiktok":
      return `https://www.tiktok.com/@${h}`;
    case "facebook":
      return `https://facebook.com/${h}`;
    case "youtube":
      return `https://youtube.com/@${h}`;
    case "linkedin":
      return `https://www.linkedin.com/company/${h}`;
    case "x":
      return `https://x.com/${h}`;
    default:
      return h.includes(".") ? `https://${h}` : "#";
  }
}

export function socialDisplay({ handle }: Social): string {
  if (/^https?:\/\//i.test(handle)) return handle.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
  return handle.startsWith("@") ? handle : `@${handle}`;
}

