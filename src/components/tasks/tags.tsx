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

export function TypeTag({ type }: { type: string }) {
  return (
    <span className={base} style={tint(typeColor(type))}>
      {type}
    </span>
  );
}

/** Format (left out for an ordinary video when `quietVideo`) and type, side by side. */
export function PostTags({ format, type, formatLabel, quietVideo = false }: { format: PostFormat; type: string | null; formatLabel: string; quietVideo?: boolean }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {!(quietVideo && format === "video") && <FormatTag format={format} label={formatLabel} />}
      {type && <TypeTag type={type} />}
    </span>
  );
}
