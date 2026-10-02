import Link from "next/link";

export type SegmentItem = { key: string; label: string; href: string; active: boolean };

/** Segmented control (design "Moji / Svi", "Mesec / Nedelja"): links, so state lives in the URL. */
export function Segmented({ items, full = false, size = "md" }: { items: SegmentItem[]; full?: boolean; size?: "md" | "lg" }) {
  return (
    <div
      className={`gap-0.5 border border-line2 p-[3px] ${full ? "grid rounded-[10px] p-1" : "inline-flex rounded-[7px]"}`}
      style={full ? { gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` } : undefined}
    >
      {items.map((it) => (
        <Link
          key={it.key}
          href={it.href}
          scroll={false}
          aria-current={it.active ? "true" : undefined}
          className={`flex items-center justify-center whitespace-nowrap font-medium transition-colors duration-[var(--dur-fast)] ${
            size === "lg" ? "h-11 rounded-[7px] px-4 text-[15px]" : "h-9 rounded-[5px] px-4 text-[14px]"
          } ${it.active ? "bg-seg text-seg-ink" : "text-ink2 hover:text-ink"}`}
        >
          {it.label}
        </Link>
      ))}
    </div>
  );
}
