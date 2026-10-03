import { weekdayIndex, type IsoDate } from "@/lib/dates";

/** Who edits a client's videos: by posting weekday (0 = Monday) and/or content type. */
export type EditorRule = { editor_id: string; days: number[]; types: string[] };

export function parseEditorRules(raw: unknown): EditorRule[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((r) => {
    if (!r || typeof r !== "object" || typeof (r as EditorRule).editor_id !== "string" || !(r as EditorRule).editor_id) return [];
    const { editor_id, days, types } = r as Partial<EditorRule>;
    return [
      {
        editor_id: editor_id!,
        days: (Array.isArray(days) ? days : []).map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6),
        types: (Array.isArray(types) ? types : []).map((x) => String(x).trim().toUpperCase()).filter(Boolean),
      },
    ];
  });
}

/**
 * The posting day decides first (the schedule is built around editors' days), the content
 * type breaks ties and covers off-days; the client's default editor is the fallback.
 */
export function pickEditor(
  rules: EditorRule[],
  fallback: string | null,
  publishDate: IsoDate,
  contentType: string | null,
): string | null {
  const day = weekdayIndex(publishDate);
  const type = contentType?.toUpperCase() ?? "";
  let best: { id: string; score: number } | null = null;
  for (const r of rules) {
    const score = (r.days.includes(day) ? 2 : 0) + (type && r.types.includes(type) ? 1 : 0);
    if (score > 0 && (!best || score > best.score)) best = { id: r.editor_id, score };
  }
  return best?.id ?? fallback;
}
