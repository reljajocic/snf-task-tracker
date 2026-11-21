/** Readable text on a colour: dark ink on light colours, off-white on dark ones. */
export function inkOn(hex: string) {
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#2F2D2E" : "#F4F3ED";
}

export const isHexColor = (s: unknown): s is string => typeof s === "string" && /^#[0-9a-fA-F]{6}$/.test(s);

/** Colours for things people tell apart at a glance (boards, custom picks): the semantic hues plus one violet.
 *  The order matters: Board picks one by a hash of the id, so reordering would recolour existing items. */
export const PICK_COLORS = ["#ea693a", "#4fa3a5", "#9a7fd1", "#6fae7b", "#d6a93e", "#5b8ec2"] as const;

/** The "any colour" swatch: the same hues round a wheel. */
export const COLOR_WHEEL = "conic-gradient(#ea693a, #d6a93e, #6fae7b, #4fa3a5, #5b8ec2, #9a7fd1, #ea693a)";
