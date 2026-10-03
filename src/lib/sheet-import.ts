import { textToSections } from "@/lib/script-text";
import type { ScriptSection, ShotStatus } from "@/lib/tasks";

// Reads the team's shoot sheet (Google Sheets → CSV):
//   ,SNIMANJE četvrtak [28. 5. 2026.],,,…
//   REDNI BROJ,STATUS,VREME,OSOBA,TIP,NASLOV,OPIS/TEXT,NAPOMENA
//   1,FILMED,20:00,Marko Rosandić,FUN,"Naslov","HOOK: …",
//   2,FILMED,,Marko Rosandić,INFO,…            ← empty time = same as the row above

export type SheetVideo = {
  order: number;
  status: ShotStatus;
  time: string | null;
  person: string;
  type: string;
  title: string;
  script: ScriptSection[];
  note: string;
};

export type ParsedShoot = { date: string | null; videos: SheetVideo[]; callTimes: { time: string; name: string; note: string }[] };

/** RFC 4180-ish CSV parser (quoted fields, doubled quotes, newlines inside quotes). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const norm = (s: string) => s.trim().toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function findColumn(header: string[], names: string[]) {
  return header.findIndex((h) => names.some((n) => norm(h).startsWith(n)));
}

function parseStatus(s: string): ShotStatus {
  const v = norm(s);
  if (v.startsWith("NOT") || v.startsWith("NIJE")) return "not_shot";
  if (v.startsWith("FILMED") || v.startsWith("SNIMLJEN")) return "shot";
  return "to_shoot";
}

/** "SNIMANJE četvrtak [28. 5. 2026.]" → 2026-05-28 */
function findDate(rows: string[][]): string | null {
  for (const r of rows.slice(0, 6)) {
    for (const c of r) {
      const m = c.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
      if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    }
  }
  return null;
}

export function parseShootSheet(csv: string): ParsedShoot {
  const rows = parseCsv(csv);
  const headerIdx = rows.findIndex((r) => r.some((c) => norm(c) === "NASLOV" || norm(c) === "TITLE"));
  if (headerIdx < 0) throw new Error("Couldn't find the header row (needs a NASLOV / TITLE column).");
  const header = rows[headerIdx];
  const col = {
    status: findColumn(header, ["STATUS"]),
    time: findColumn(header, ["VREME", "TIME"]),
    person: findColumn(header, ["OSOBA", "PERSON"]),
    type: findColumn(header, ["TIP", "TYPE"]),
    title: findColumn(header, ["NASLOV", "TITLE"]),
    text: findColumn(header, ["OPIS", "TEXT", "TEKST", "SKRIPTA"]),
    note: findColumn(header, ["NAPOMENA", "NOTE"]),
  };
  const get = (r: string[], i: number) => (i >= 0 ? (r[i] ?? "").trim() : "");

  const videos: SheetVideo[] = [];
  const callTimes: ParsedShoot["callTimes"] = [];
  let lastTime: string | null = null;
  for (const r of rows.slice(headerIdx + 1)) {
    const title = get(r, col.title);
    if (!title) continue;
    const rawTime = get(r, col.time);
    const time = /^\d{1,2}:\d{2}$/.test(rawTime) ? rawTime.padStart(5, "0") : null;
    const person = get(r, col.person);
    if (time) {
      lastTime = time;
      if (person) callTimes.push({ time, name: person, note: "" });
    }
    videos.push({
      order: videos.length,
      status: parseStatus(get(r, col.status)),
      time: time ?? lastTime,
      person,
      type: get(r, col.type).toUpperCase(),
      title,
      script: textToSections(get(r, col.text)),
      note: get(r, col.note),
    });
  }
  return { date: findDate(rows), videos, callTimes };
}

/** Accepts a normal Google Sheets link and returns the CSV export URL for that tab. */
export function csvExportUrl(link: string): string | null {
  const id = link.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)?.[1];
  if (!id) return null;
  const gid = link.match(/[#&?]gid=(\d+)/)?.[1] ?? "0";
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
}
