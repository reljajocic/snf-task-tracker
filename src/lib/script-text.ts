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
