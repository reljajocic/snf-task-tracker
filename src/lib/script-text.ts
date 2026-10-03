import type { ScriptSection } from "@/lib/tasks";

// Scripts are written the way the team writes them in Sheets:
//   HOOK: …
//   CTA 1: …
//   BODY: …   (can run over several lines)
// Lines starting with a known label begin a new section; anything before the first label
// (or without labels at all, e.g. "Anketa.") becomes an unlabeled section.

const LABEL = /^\s*(HOOK|LEAD|BODY(?:\s*\d+)?|OPEN\s*LOOP|CTA(?:\s*\d+)?|INTRO|OUTRO|TEXT|TEKST)\s*:\s*/i;

export function textToSections(text: string): ScriptSection[] {
  const out: ScriptSection[] = [];
  for (const raw of text.replace(/\r\n/g, "\n").split("\n")) {
    const m = raw.match(LABEL);
    if (m) {
      out.push({ label: m[1].replace(/\s+/g, " ").toUpperCase().replace(/^OPENLOOP$/, "OPEN LOOP"), text: raw.slice(m[0].length) });
    } else if (out.length) {
      out[out.length - 1].text += `\n${raw}`;
    } else if (raw.trim()) {
      out.push({ label: "", text: raw });
    }
  }
  return out.map((s) => ({ label: s.label, text: s.text.trim() })).filter((s) => s.label || s.text);
}

export function sectionsToText(sections: ScriptSection[]): string {
  return sections
    .filter((s) => s.text.trim() || s.label.trim())
    .map((s) => (s.label.trim() ? `${s.label.trim().toUpperCase()}: ${s.text.trim()}` : s.text.trim()))
    .join("\n");
}

/** Shoot order: by call time (rows without a time last), then the order they were added in. */
export function byShootTime<T extends { shoot_time: string | null; created_at: string }>(a: T, b: T) {
  const ta = a.shoot_time ?? "99:99";
  const tb = b.shoot_time ?? "99:99";
  if (ta !== tb) return ta < tb ? -1 : 1;
  const oa = (a as { shoot_order?: number | null }).shoot_order ?? Number.MAX_SAFE_INTEGER;
  const ob = (b as { shoot_order?: number | null }).shoot_order ?? Number.MAX_SAFE_INTEGER;
  return oa !== ob ? oa - ob : a.created_at.localeCompare(b.created_at);
}

/** Call sheet derived from the videos: one line per time with everyone on camera then. */
export function deriveCallTimes(videos: { shoot_time: string | null; on_camera: string | null }[]) {
  const byTime = new Map<string, string[]>();
  for (const v of videos) {
    if (!v.shoot_time) continue;
    const names = byTime.get(v.shoot_time) ?? [];
    if (v.on_camera && !names.includes(v.on_camera)) names.push(v.on_camera);
    byTime.set(v.shoot_time, names);
  }
  return [...byTime.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([time, names]) => ({ time, name: names.join(", ") }));
}

const URL_RE = /(https?:\/\/[^\s]+)/i;

/** "ceo link: https://…" → { reference: "https://…", rest: "" } (used by the sheet import). */
export function splitReference(note: string): { reference: string | null; rest: string } {
  const m = note.match(URL_RE);
  if (!m) return { reference: null, rest: note.trim() };
  const rest = note.replace(m[0], "").replace(/(ceo\s+)?link\s*:?\s*$/i, "").trim();
  return { reference: m[0], rest };
}
