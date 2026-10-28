// What a planned post is (video, photo, carousel) and the colours that tell posts apart at a glance:
// the format has a fixed colour; a client's content types (COMPLEX, EASY, …) get a steady colour of their own.

export const FORMATS = ["video", "photo", "carousel"] as const;
export type PostFormat = (typeof FORMATS)[number];
export const parseFormat = (v: unknown): PostFormat => (FORMATS.includes(v as PostFormat) ? (v as PostFormat) : "video");

export const FORMAT_COLOR: Record<PostFormat, string> = {
  video: "#ea693a",
  photo: "#4f8fd6",
  carousel: "#9a6fd1",
};

// Mid-tone colours that read on both themes (and none of them the format colours).
const TYPE_COLORS = ["#3f9c9e", "#c8962c", "#5fa36e", "#c25f86", "#7d8a3a", "#b4704a", "#5a7fc0", "#8f6bb0"];

/** The same type always gets the same colour (from its name), on every screen and for every client. */
export function typeColor(type: string): string {
  let h = 0;
  for (const ch of type.trim().toUpperCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TYPE_COLORS[h % TYPE_COLORS.length];
}
