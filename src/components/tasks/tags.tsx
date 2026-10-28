import { FORMAT_COLOR, typeColor, type PostFormat } from "@/lib/formats";

// Coloured tags for planned posts: the format (video / photo / carousel) and the client's content type.
// Labels come from the caller (the portal translates into the client's language, the app into the user's).

const tint = (c: string) => ({ color: c, background: `color-mix(in srgb, ${c} 15%, transparent)`, borderColor: `color-mix(in srgb, ${c} 40%, transparent)` });
const base = "inline-flex flex-none items-center gap-1 whitespace-nowrap rounded-[3px] border px-1.5 py-1 text-[11px] font-semibold uppercase leading-none tracking-[0.08em]";

export function FormatTag({ format, label }: { format: PostFormat; label: string }) {
  return (
    <span className={base} style={tint(FORMAT_COLOR[format])}>
      {label}
    </span>
  );
}

/** The content type stays quiet next to the format: a dot in its colour and small text, no box. */
export function TypeTag({ type }: { type: string }) {
  return (
    <span className="inline-flex flex-none items-center gap-1 whitespace-nowrap text-[10px] font-semibold uppercase leading-none tracking-[0.06em] text-ink3">
      <span className="size-1.5 flex-none rounded-full" style={{ background: typeColor(type) }} />
      {type}
    </span>
  );
}

/** Format (left out for an ordinary video when `quietVideo`) and type, side by side. */
export function PostTags({ format, type, formatLabel, quietVideo = false }: { format: PostFormat; type: string | null; formatLabel: string; quietVideo?: boolean }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
      {!(quietVideo && format === "video") && <FormatTag format={format} label={formatLabel} />}
      {type && <TypeTag type={type} />}
    </span>
  );
}
