import Link from "next/link";

export type SegmentItem = {
  key: string;
  label: string;
  active: boolean;
  /** A link (state in the URL) … */
  href?: string;
  /** … or a button (state in the component). */
  onClick?: () => void;
  /** A coloured dot before the label (e.g. a post type). */
  dot?: string;
  /** A count after the label. */
  count?: number;
};

/**
 * The one control for picking one of a few options (design "Moji / Svi", "Mesec / Nedelja", filters):
 * every filter row in the app uses it, so they all look and behave the same.
 */
export function Segmented({
  items,
  full = false,
  size = "md",
  scroll = false,
  nowrap = false,
}: {
  items: SegmentItem[];
  full?: boolean;
  size?: "sm" | "md" | "lg";
  /** One row in its own sideways-scrolling strip. */
  scroll?: boolean;
  /** One row, never shrinking (for a row of several controls that scrolls as a whole). */
  nowrap?: boolean;
}) {
  const sz = size === "lg" ? "h-11 rounded-[7px] px-4 text-[15px]" : size === "sm" ? "h-8 rounded-[5px] px-3 text-[13px]" : "h-9 rounded-[5px] px-4 text-[14px]";
  // scroll: one row that slides sideways when it doesn't fit (phones), instead of wrapping onto a second line.
  const control = (
    <div
      className={`gap-0.5 border border-line2 p-[3px] ${full ? "grid rounded-[10px] p-1" : `inline-flex rounded-[7px] ${scroll || nowrap ? "flex-none flex-nowrap" : "max-w-full flex-wrap"}`}`}
      style={full ? { gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` } : undefined}
    >
      {items.map((it) => {
        const cls = `flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap font-medium transition-colors duration-[var(--dur-fast)] ${sz} ${
          it.active ? "bg-seg text-seg-ink" : "text-ink2 hover:text-ink"
        }`;
        const body = (
          <>
            {it.dot && <span className="size-2 flex-none rounded-full" style={{ background: it.dot }} />}
            {it.label}
            {it.count !== undefined && <span className={it.active ? "opacity-70" : "text-ink3"}>{it.count}</span>}
          </>
        );
        return it.href !== undefined ? (
          <Link key={it.key} href={it.href} scroll={false} aria-current={it.active ? "true" : undefined} className={cls}>
            {body}
          </Link>
        ) : (
          <button key={it.key} type="button" onClick={it.onClick} aria-pressed={it.active} className={cls}>
            {body}
          </button>
        );
      })}
    </div>
  );
  return scroll ? <div className="no-scrollbar -mx-1 max-w-full overflow-x-auto px-1">{control}</div> : control;
}
