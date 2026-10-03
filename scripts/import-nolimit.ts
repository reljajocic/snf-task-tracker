// One-off import of NoLimit Gym's history from Google Sheets: the shoot sheets (one file per
// location, one tab per shoot day) and the posting schedule (one tab per two months).
//
//   npm run import:nolimit                 # dry run: prints what would be created
//   npm run import:nolimit -- --write      # creates the client, shoot days and videos
//   … -- --write --vucko vucko@slatenframe.com   # also routes Wed/Fri + INFO/FUN edits to Vučko
//
// Rules (agreed with Relja, 2026-10-03):
// - Schedule rows are matched to shoot-sheet videos by title (+ shoot date when given).
// - PUBLISHED/DONE → published on the schedule date. SCRAPED → dropped.
// - FILMED with a date before CUTOFF is assumed to be out (published); later ones stay in edit,
//   assigned by the editor rules with a deadline the day before posting.
// - Filmed but never scheduled: in the "Shot, no date" queue if shot after QUEUE_FROM, else dropped.
// - Not shot: dropped if it was moved to a later shoot or is older than OPEN_FROM, else left open.
import { createClient } from "@supabase/supabase-js";
import { parseArgs } from "node:util";
import { addDays, weekdayIndex } from "@/lib/dates";
import { pickEditor, type EditorRule } from "@/lib/editor-rules";
import { textToSections, splitReference } from "@/lib/script-text";
import { parseCsv, parseShootSheet, type SheetVideo } from "@/lib/sheet-import";

const CUTOFF = "2026-09-01";
const QUEUE_FROM = "2026-06-01";
const OPEN_FROM = "2026-08-01";
const CLIENT_NAME = "NoLimit Gym";
const LOCATIONS = ["Detelinara", "Liman", "Podbara", "Telep", "Novo Naselje", "Univerzalno"];

const SHOOT_FILES: [string, string][] = [
  ["Detelinara", "1Ep2ODtNhBRZFMWDz0ZrpNtgiqxMuvCCakOrNKKtiXtc"],
  ["Liman", "1FMoE6LcgLqkzl1Y0uW7x8VI_YUdvxhpBjuhRkd2ZRwQ"],
  ["Podbara", "1UAIuVYI_ENCASwSbXdpUHx8Hz5XzuW3dNPG2b6stifA"],
  ["Telep", "1Q6Siyw2j5Vm3McH55E_QRw1WkJ_06edpNhv5ZWnFD2g"],
  ["Novo Naselje", "16VWho9fW6RQDC6DoANXwB4-0W-rwxsLE1umYTfI9t9M"],
];
const SCHEDULE_FILE = "16ydwPyvqQF1ubb80nf9XfG5iXzX8x6GZNkGvl-SfnGE";

const { values: args } = parseArgs({
  options: { write: { type: "boolean", default: false }, vucko: { type: "string" } },
});

// --- Sheets -----------------------------------------------------------------

async function tabs(file: string): Promise<{ name: string; gid: string }[]> {
  const html = await (await fetch(`https://docs.google.com/spreadsheets/d/${file}/htmlview`)).text();
  return [...html.matchAll(/\{name:\s*"((?:[^"\\]|\\.)*)",\s*pageUrl:\s*"[^"]*gid=(\d+)/g)].map((m) => ({
    name: JSON.parse(`"${m[1]}"`),
    gid: m[2],
  }));
}

async function csv(file: string, gid: string) {
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${file}/export?format=csv&gid=${gid}`);
  if (!(res.headers.get("content-type") ?? "").includes("csv")) throw new Error(`Sheet ${file} tab ${gid} is not shared publicly.`);
  return res.text();
}

const isoFrom = (s: string) => {
  const m = s.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : null;
};

const key = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "dj").replace(/[^a-z0-9]+/g, " ").trim();

const stripEmoji = (s: string) => s.replace(/[^\p{L}\p{N}\s/&.-]/gu, "").replace(/\s+/g, " ").trim();

const TYPE_ALIAS: Record<string, string> = { INFORMATIVNI: "INFO", EDUKATIVNI: "INFO", ZABAVA: "FUN", TERETANA: "GYM" };
const normType = (s: string) => {
  const t = stripEmoji(s).toUpperCase();
  return TYPE_ALIAS[t] ?? (t || null);
};

const normLocation = (s: string) => {
  const t = stripEmoji(s).toUpperCase();
  if (/DETELINARA|SAJAM/.test(t)) return "Detelinara";
  if (t.includes("LIMAN")) return "Liman";
  if (t.includes("PODBARA")) return "Podbara";
  if (t.includes("TELEP")) return "Telep";
  if (t.includes("NASELJE")) return "Novo Naselje";
  if (/UNIVERZ|UNIVERSAL|OBE|BOTH/.test(t)) return "Univerzalno";
  return null;
};

type Shoot = { location: string; date: string; videos: SheetVideo[] };
type Row = {
  tab: string;
  date: string | null;
  status: string;
  person: string;
  location: string | null;
  type: string | null;
  title: string;
  text: string;
  note: string;
  shootDate: string | null;
};

async function readShoots(): Promise<Shoot[]> {
  const out: Shoot[] = [];
  for (const [location, file] of SHOOT_FILES) {
    for (const tab of await tabs(file)) {
      const parsed = parseShootSheet(await csv(file, tab.gid));
      const date = parsed.date ?? isoFrom(tab.name);
      if (!date) throw new Error(`No date for ${location} / ${tab.name}`);
      // The Liman file has the same shoot twice.
      if (out.some((s) => s.location === location && s.date === date)) continue;
      out.push({ location, date, videos: parsed.videos.filter((v) => v.title.trim()) });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

async function readSchedule(): Promise<Row[]> {
  const out: Row[] = [];
  for (const tab of await tabs(SCHEDULE_FILE)) {
    const rows = parseCsv(await csv(SCHEDULE_FILE, tab.gid));
    const h = rows.findIndex((r) => r.some((c) => c.trim().toUpperCase() === "NASLOV"));
    if (h < 0) continue;
    const head = rows[h].map((c) => c.trim().toUpperCase());
    const col = (name: string) => head.findIndex((c) => c === name || c.startsWith(`${name}/`));
    const c = {
      date: col("DATUM"),
      status: col("STATUS"),
      person: col("OSOBA"),
      location: col("LOKACIJA"),
      type: col("TIP"),
      title: col("NASLOV"),
      text: col("OPIS"),
      note: col("NAPOMENA"),
      shoot: col("DATUM SNIMANJA"),
    };
    let prev: string | null = null;
    for (const r of rows.slice(h + 1)) {
      const get = (i: number) => (i >= 0 ? (r[i] ?? "").trim() : "");
      // Slots are copied from a template and sometimes keep an old month ("3. 8. 2026. ponedeljak"
      // after 30. 9.): a date earlier than the one above means the next slot on that weekday.
      let date = isoFrom(get(c.date));
      if (date && prev && date < prev) {
        const target = weekdayIndex(date);
        date = addDays(prev, 1);
        while (weekdayIndex(date) !== target) date = addDays(date, 1);
      }
      if (date) prev = date;
      const title = get(c.title);
      if (!title || ["NASLOV", "PROPALI VIDEI"].includes(title.toUpperCase())) continue;
      out.push({
        tab: tab.name,
        date,
        status: get(c.status).toUpperCase(),
        person: get(c.person),
        location: normLocation(get(c.location)),
        type: normType(get(c.type)),
        title,
        text: get(c.text),
        note: get(c.note),
        shootDate: isoFrom(get(c.shoot)),
      });
    }
  }
  return out;
}

// --- Plan -------------------------------------------------------------------

type Outcome =
  | { kind: "published"; date: string }
  | { kind: "edit"; date: string | null }
  | { kind: "dropped"; date: string }
  | { kind: "not_shot" };

type PlannedVideo = {
  title: string;
  on_camera: string | null;
  content_type: string | null;
  location: string | null;
  script: { label: string; text: string }[];
  note: string | null;
  reference_url: string | null;
  shoot: Shoot | null;
  video: SheetVideo | null;
  outcome: Outcome;
};

function fromSchedule(r: Row, fallbackDate: string, shot: boolean): Outcome {
  if (r.status === "PUBLISHED" || r.status === "DONE") return { kind: "published", date: r.date ?? fallbackDate };
  if (r.status === "SCRAPED") return { kind: "dropped", date: r.date ?? fallbackDate };
  if (r.date && r.date < CUTOFF) return { kind: "published", date: r.date };
  if (r.date) return { kind: "edit", date: r.date };
  // Filmed, waiting for a date: only recent material is still usable.
  const tabYear = r.tab.match(/20\d\d/)?.[0] ?? "";
  return shot && (r.shootDate ?? `${tabYear}-12-31`) >= "2026-01-01" ? { kind: "edit", date: null } : { kind: "dropped", date: r.shootDate ?? fallbackDate };
}

function plan(shoots: Shoot[], schedule: Row[]): PlannedVideo[] {
  const pool = shoots.flatMap((s) => s.videos.map((v) => ({ shoot: s, video: v, claimed: false })));
  const matches = new Map<(typeof pool)[number], Row>();
  const extra: Row[] = [];

  for (const r of schedule) {
    const k = key(r.title);
    const candidates = pool.filter((p) => !p.claimed && key(p.video.title) === k && (!r.date || p.shoot.date <= r.date));
    const best =
      candidates.find((p) => r.shootDate && p.shoot.date === r.shootDate) ??
      candidates.filter((p) => p.video.status === "shot").at(-1) ??
      candidates.at(-1);
    if (best) {
      best.claimed = true;
      matches.set(best, r);
    } else {
      extra.push(r);
    }
  }

  const out: PlannedVideo[] = [];
  for (const p of pool) {
    const { shoot, video } = p;
    const r = matches.get(p);
    let outcome: Outcome;
    if (r) {
      outcome = fromSchedule(r, shoot.date, video.status === "shot");
    } else if (video.status === "shot") {
      outcome = shoot.date >= QUEUE_FROM ? { kind: "edit", date: null } : { kind: "dropped", date: shoot.date };
    } else {
      const movedOn = pool.some((q) => q.shoot.date > shoot.date && key(q.video.title) === key(video.title));
      outcome = movedOn || shoot.date < OPEN_FROM ? { kind: "dropped", date: shoot.date } : { kind: "not_shot" };
    }
    out.push({
      title: video.title.trim(),
      on_camera: video.person || null,
      content_type: normType(video.type),
      location: shoot.location,
      script: video.script,
      note: video.note || null,
      reference_url: video.reference,
      shoot,
      video,
      outcome,
    });
  }

  for (const r of extra) {
    if (!r.date && !r.status) continue; // an idea parked in the schedule, never filmed
    const { reference, rest } = splitReference(r.note);
    out.push({
      title: r.title,
      on_camera: r.person || null,
      content_type: r.type,
      location: r.location,
      script: textToSections(r.text),
      note: rest || null,
      reference_url: reference,
      shoot: null,
      video: null,
      outcome: fromSchedule(r, r.date ?? r.shootDate ?? "2024-01-01", true),
    });
  }
  return out;
}

// --- Write ------------------------------------------------------------------

async function main() {
  const [shoots, schedule] = await Promise.all([readShoots(), readSchedule()]);
  const videos = plan(shoots, schedule);

  const count = (k: Outcome["kind"]) => videos.filter((v) => v.outcome.kind === k).length;
  const open = videos.filter((v) => v.outcome.kind === "edit" || v.outcome.kind === "not_shot");
  console.log(`Shoot days: ${shoots.length} (${shoots[0]?.date} … ${shoots.at(-1)?.date})`);
  console.log(`Schedule rows: ${schedule.length}`);
  console.log(
    `Videos: ${videos.length} — published ${count("published")}, dropped ${count("dropped")}, in edit ${count("edit")}, not shot (open) ${count("not_shot")}`,
  );
  console.log("Still open after the import:");
  for (const v of open.sort((a, b) => (a.outcome.kind === "edit" && a.outcome.date ? a.outcome.date : "9") .localeCompare(b.outcome.kind === "edit" && b.outcome.date ? b.outcome.date : "9"))) {
    const when = v.outcome.kind === "edit" ? (v.outcome.date ?? "no date") : "not shot";
    console.log(`  ${when.padEnd(10)}  ${(v.content_type ?? "").padEnd(5)}  ${v.title}  (${v.shoot?.location ?? "—"} ${v.shoot?.date ?? ""})`);
  }
  if (!args.write) {
    console.log("\nDry run. Add --write to import.");
    return;
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const must = <T>(res: { data: T; error: { message: string } | null }, what: string): NonNullable<T> => {
    if (res.error || res.data == null) throw new Error(`${what}: ${res.error?.message ?? "no data"}`);
    return res.data;
  };

  const profiles = must(await supabase.from("profiles").select("id, email, role"), "profiles");
  const admin = profiles.find((p) => p.role === "admin");
  if (!admin) throw new Error("No admin profile.");
  const marko = profiles.find((p) => p.email?.startsWith("marko@"));
  const vucko = args.vucko ? profiles.find((p) => p.email?.toLowerCase() === args.vucko!.toLowerCase()) : undefined;
  if (args.vucko && !vucko) throw new Error(`No profile for ${args.vucko} — invite them first.`);

  const existing = must(await supabase.from("clients").select("id").eq("name", CLIENT_NAME), "clients");
  if (existing.length) throw new Error(`"${CLIENT_NAME}" already exists — delete it first to re-import.`);

  const rules: EditorRule[] = [
    ...(vucko ? [{ editor_id: vucko.id, days: [2, 4], types: ["INFO", "FUN"] }] : []),
    { editor_id: admin.id, days: [0], types: ["GYM"] },
  ];
  const client = must(
    await supabase
      .from("clients")
      .insert({
        name: CLIENT_NAME,
        status: "active",
        services: ["Social media", "Video"],
        city: "Novi Sad",
        locations: LOCATIONS,
        content_types: ["GYM", "INFO", "FUN"],
        posting_days: [0, 2, 4],
        editor_rules: rules,
        since: shoots[0]?.date ?? null,
      })
      .select("id")
      .single(),
    "client",
  );
  if (marko) await supabase.from("client_members").insert({ client_id: client.id, user_id: marko.id, role: "manager" });

  const shootIds = new Map<Shoot, string>();
  const shootRows = must(
    await supabase
      .from("shoot_days")
      .insert(shoots.map((s) => ({ client_id: client.id, date: s.date, location: s.location, created_by: admin.id })))
      .select("id, date, location"),
    "shoot days",
  );
  for (const s of shoots) shootIds.set(s, shootRows.find((r) => r.date === s.date && r.location === s.location)!.id);

  const rows = videos.map((v) => {
    const o = v.outcome;
    const shot = !v.video || v.video.status === "shot";
    const createdAt = v.shoot?.date ?? (o.kind === "published" || o.kind === "dropped" ? o.date : CUTOFF);
    const editor = o.kind === "edit" && o.date ? pickEditor(rules, null, o.date, v.content_type) : null;
    return {
      row: {
        kind: "video" as const,
        client_id: client.id,
        title: v.title,
        on_camera: v.on_camera,
        content_type: v.content_type,
        location: v.location,
        script: v.script,
        note: v.note,
        reference_url: v.reference_url,
        shoot_id: v.shoot ? shootIds.get(v.shoot)! : null,
        shoot_time: v.video?.time ?? null,
        shoot_order: v.video?.order ?? null,
        shot_status: v.video?.status ?? "shot",
        phase: o.kind === "published" ? 5 : shot ? 2 : 1,
        publish_date: o.kind === "published" || o.kind === "edit" ? o.date : null,
        published_at: o.kind === "published" ? o.date : null,
        dropped_at: o.kind === "dropped" ? o.date : null,
        due_date: editor && o.kind === "edit" && o.date ? addDays(o.date, -1) : null,
        created_by: admin.id,
        created_at: `${createdAt}T12:00:00+02:00`,
      },
      editor,
      closedOn: o.kind === "published" || o.kind === "dropped" ? o.date : null,
    };
  });

  let done = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200);
    const ids = must(await supabase.from("tasks").insert(batch.map((b) => b.row)).select("id"), "videos");
    const assignees = batch.flatMap((b, j) => (b.editor ? [{ task_id: ids[j].id, user_id: b.editor }] : []));
    if (assignees.length) must(await supabase.from("task_assignees").insert(assignees).select("task_id"), "assignees");
    // History shouldn't look like it was all finished today (the board shows recent "done").
    const byDay = new Map<string, string[]>();
    batch.forEach((b, j) => b.closedOn && byDay.set(b.closedOn, [...(byDay.get(b.closedOn) ?? []), ids[j].id]));
    for (const [day, dayIds] of byDay) {
      const at = `${day}T12:00:00+02:00`;
      must(await supabase.from("tasks").update({ completed_at: at, status_changed_at: at }).in("id", dayIds).select("id"), "history dates");
    }
    done += batch.length;
    console.log(`  ${done}/${rows.length}`);
  }
  console.log(`Imported ${CLIENT_NAME}: ${shoots.length} shoot days, ${rows.length} videos.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
