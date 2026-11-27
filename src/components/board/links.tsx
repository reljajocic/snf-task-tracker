// Links pinned to a moodboard. A pasted or dropped web link becomes a box on the board (an Excalidraw
// "embeddable") that moves and groups like anything else. What's in the box depends on the link:
//  - Instagram posts and reels, TikTok videos and Pinterest pins play or show right on the board (their embed pages);
//  - links Excalidraw already plays (YouTube, Vimeo, Figma, X…) keep its own player;
//  - anything else is a card with the site and the page, opening in a new tab.
import { safeHref } from "@/lib/safe-url";

type Embed = { kind: "embed"; src: string; w: number; h: number; title: string };
type Card = { kind: "card"; href: string; site: string; page: string };
export type LinkView = Embed | Card | { kind: "native" };

// Excalidraw's own players (their domains); for these the board keeps Excalidraw's iframe.
const NATIVE = /(^|\.)(youtube\.com|youtu\.be|vimeo\.com|figma\.com|twitter\.com|x\.com|gist\.github\.com|reddit\.com|giphy\.com|stackblitz\.com|val\.town)$/;

export const isWebLink = (link: string) => /^https?:\/\/[^\s/$.?#][^\s]*$/i.test(link.trim());

export function linkView(link: string): LinkView | null {
  const href = safeHref(link);
  if (!href || !isWebLink(href)) return null;
  const url = new URL(href);
  const host = url.hostname.replace(/^www\./, "");
  const path = url.pathname;
  let m: RegExpMatchArray | null;
  if (/(^|\.)instagram\.com$/.test(host) && (m = path.match(/^\/(?:[\w.]+\/)?(p|reels?|tv)\/([\w-]+)/))) {
    const kind = m[1] === "p" ? "p" : m[1] === "tv" ? "tv" : "reel";
    return { kind: "embed", src: `https://www.instagram.com/${kind}/${m[2]}/embed/`, w: 340, h: 620, title: "Instagram" };
  }
  if (/(^|\.)tiktok\.com$/.test(host) && (m = path.match(/^\/(?:@[\w.-]+\/(?:video|photo)|embed(?:\/v2)?|v)\/(\d+)/))) {
    return { kind: "embed", src: `https://www.tiktok.com/embed/v2/${m[1]}`, w: 340, h: 720, title: "TikTok" };
  }
  if (/(^|\.)pinterest\.[a-z.]+$/.test(host) && (m = path.match(/^\/pin\/(\d+)/))) {
    return { kind: "embed", src: `https://assets.pinterest.com/ext/embed.html?id=${m[1]}`, w: 345, h: 560, title: "Pinterest" };
  }
  if (NATIVE.test(host)) return { kind: "native" };
  let page = path.replace(/\/+$/, "");
  try {
    page = decodeURIComponent(page);
  } catch {}
  return { kind: "card", href, site: host, page };
}

/** The size a new link box gets (Excalidraw makes unknown links 560 × 840). Null: keep Excalidraw's. */
export function linkBoxSize(view: LinkView | null): { width: number; height: number } | null {
  if (!view || view.kind === "native") return null;
  return view.kind === "embed" ? { width: view.w, height: view.h } : { width: 320, height: 112 };
}

/** What's drawn inside a link box. Null: Excalidraw's own iframe. */
/**
 * A link on the board. Excalidraw keeps a box asleep until it is clicked (so dragging it doesn't open or play it): until
 * then a hint says one click wakes it, and the card's "Open" shows once it's awake.
 */
export function LinkBox({
  view,
  active,
  hovered = false,
  labels,
}: {
  view: LinkView | null;
  /** Woken by a click (plays, opens) … */
  active: boolean;
  /** … or only pointed at: Excalidraw shows its own "click to interact" then, so ours steps aside. */
  hovered?: boolean;
  labels: { open: string; play: string; toOpen: string };
}) {
  if (!view || view.kind === "native") return null;
  if (view.kind === "embed") {
    return (
      <div className="relative size-full rounded-[inherit]">
        <iframe
          src={view.src}
          title={view.title}
          loading="lazy"
          allow="autoplay; encrypted-media; picture-in-picture; clipboard-write; fullscreen"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation"
          referrerPolicy="strict-origin-when-cross-origin"
          className="block size-full rounded-[inherit] border-0 bg-bg"
        />
        {!active && !hovered && (
          <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--scrim)] px-3 py-1.5 text-[13px] font-semibold text-[var(--scrim-ink)]">
            {labels.play}
          </span>
        )}
      </div>
    );
  }
  return (
    <a
      href={view.href}
      target="_blank"
      rel="noreferrer noopener"
      className="flex size-full flex-col justify-center gap-1.5 overflow-hidden rounded-[inherit] border border-line2 bg-bg px-4 text-ink no-underline"
    >
      <span className="truncate text-[16px] font-semibold leading-tight">{view.site}</span>
      {view.page && <span className="truncate text-[13px] leading-tight text-ink2">{view.page}</span>}
      <span className={`text-[13px] font-semibold leading-tight ${active ? "text-rust-ink" : "text-ink3"}`}>{active ? `${labels.open} ↗` : labels.toOpen}</span>
    </a>
  );
}
