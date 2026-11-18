import { safeHref } from "@/lib/safe-url";

// Client docs are plain text with a few marks people already type in chats and notes:
//   # Heading / ## Smaller heading
//   - item / * item / 1. item
//   **bold**
//   links (https://…, drive.google.com/…, www.…) become clickable.
// Everything else is a paragraph; an empty line separates paragraphs.

export type Inline = { kind: "text"; text: string } | { kind: "bold"; text: string } | { kind: "link"; text: string; href: string };
export type Block =
  | { kind: "heading"; level: 1 | 2; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "paragraph"; text: string };

const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBER = /^\s*\d+[.)]\s+(.*)$/;
const HEADING = /^\s*(#{1,3})\s+(.*)$/;

export function docBlocks(body: string): Block[] {
  const out: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) out.push({ kind: "paragraph", text: para.join("\n") });
    para = [];
  };
  for (const line of body.replace(/\r\n/g, "\n").split("\n")) {
    const h = line.match(HEADING);
    const b = line.match(BULLET);
    const n = line.match(NUMBER);
    if (h) {
      flush();
      out.push({ kind: "heading", level: h[1].length === 1 ? 1 : 2, text: h[2].trim() });
    } else if (b || n) {
      flush();
      const ordered = !b;
      const item = (b ?? n)![1].trim();
      const last = out[out.length - 1];
      if (last?.kind === "list" && last.ordered === ordered) last.items.push(item);
      else out.push({ kind: "list", ordered, items: [item] });
    } else if (!line.trim()) {
      flush();
    } else {
      // A line under a list item that isn't an item of its own continues it.
      const last = out[out.length - 1];
      if (!para.length && last?.kind === "list" && /^\s+/.test(line)) last.items[last.items.length - 1] += ` ${line.trim()}`;
      else para.push(line.trim());
    }
  }
  flush();
  return out;
}

const LINK = /(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"]|(?:www\.|drive\.google\.com\/|docs\.google\.com\/|(?:www\.)?dropbox\.com\/)[^\s<>()]*[^\s<>().,;:!?'"])/g;

function links(text: string): Inline[] {
  const out: Inline[] = [];
  let at = 0;
  for (const m of text.matchAll(LINK)) {
    const href = safeHref(m[0]);
    if (!href) continue;
    if (m.index > at) out.push({ kind: "text", text: text.slice(at, m.index) });
    out.push({ kind: "link", text: m[0].replace(/^https?:\/\//, "").replace(/^www\./, ""), href });
    at = m.index + m[0].length;
  }
  if (at < text.length) out.push({ kind: "text", text: text.slice(at) });
  return out;
}

/** Bold and links inside a line. Bold text isn't searched for links (rare, and keeps it simple). */
export function docInline(text: string): Inline[] {
  const out: Inline[] = [];
  const parts = text.split(/\*\*(.+?)\*\*/g);
  parts.forEach((p, i) => {
    if (!p) return;
    if (i % 2) out.push({ kind: "bold", text: p });
    else out.push(...links(p));
  });
  return out;
}

/** A first line to show under the title in the list of docs. */
export function docSnippet(body: string, max = 90) {
  const first = docBlocks(body).find((b) => b.kind !== "heading") ?? docBlocks(body)[0];
  if (!first) return "";
  const text = (first.kind === "list" ? first.items.join(" · ") : first.text).replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
