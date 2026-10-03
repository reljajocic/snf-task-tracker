// One-off import of Berić satovi i nakit from the team's Google Sheet: one tab per shoot day
// (no posting schedule), plus an ideas tab and instructions.
//
//   npm run import:beric               # dry run
//   npm run import:beric -- --write
//
// Rules (Relja, 2026-10-03): not-filmed videos only from the last two shoots (Vršac, Promenada)
// go to the video bank; other not-filmed ones (and the IDEJE tab) are left out.
import { createClient } from "@supabase/supabase-js";
import { parseArgs } from "node:util";
import { splitReference, textToSections } from "@/lib/script-text";
import { parseCsv } from "@/lib/sheet-import";

const FILE = "1pkxki8MUJ4OGOsQpFlZnW74yiymV8eYdHJSAHY27_7E";
const CLIENT_NAME = "Berić satovi i nakit";
const KEEP_IDEAS_FROM = 2; // not-filmed videos are kept only from the latest N shoots
const IG = "Instagram & Facebook";
const TT = "TikTok";

const { values: args } = parseArgs({ options: { write: { type: "boolean", default: false } } });

async function tabs(): Promise<{ name: string; gid: string }[]> {
  const html = await (await fetch(`https://docs.google.com/spreadsheets/d/${FILE}/htmlview`)).text();
  return [...html.matchAll(/\{name:\s*"((?:[^"\\]|\\.)*)",\s*pageUrl:\s*"[^"]*gid=(\d+)/g)].map((m) => ({
    name: m[1].replace(/\\x([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/\\(.)/g, "$1"),
    gid: m[2],
  }));
}

async function csv(gid: string) {
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${FILE}/export?format=csv&gid=${gid}`);
  if (!(res.headers.get("content-type") ?? "").includes("csv")) throw new Error(`Tab ${gid} is not shared publicly.`);
  return res.text();
}

const isoFrom = (s: string) => {
  const m = s.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : null;
};
const key = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const person = (s: string) => (s.trim() && s.trim().toUpperCase() !== "N/A" ? s.trim() : null);
const profileOf = (platform: string) => {
  const p = platform.toUpperCase();
  if (p.includes("TIKTOK") && p.includes("INSTA")) return null; // both
  if (p.includes("INSTA")) return IG;
  if (p.includes("TIKTOK")) return TT;
  return null;
};

type Status = "filmed" | "not_filmed" | "published" | "scraped";
type Video = {
  order: number;
  status: Status;
  time: string | null;
  title: string;
  on_camera: string | null;
  profile: string | null;
  script: { label: string; text: string }[];
  note: string | null;
  reference_url: string | null;
};
type Shoot = { date: string; location: string | null; videos: Video[] };

function parseShoot(text: string): Video[] {
  const rows = parseCsv(text);
  const h = rows.findIndex((r) => r.some((c) => c.trim().toUpperCase() === "NASLOV"));
  if (h < 0) return [];
  const head = rows[h].map((c) => c.trim().toUpperCase().split("/")[0]);
  const col = (name: string) => head.indexOf(name);
  const extra = head.map((c, i) => (c === "" && i > col("NASLOV") ? i : -1)).filter((i) => i >= 0);
  const out: Video[] = [];
  let time: string | null = null;
  rows.slice(h + 1).forEach((r, i) => {
    const get = (c: number) => (c >= 0 ? (r[c] ?? "").trim() : "");
    const t = get(col("VREME")).match(/^(\d{1,2}):(\d{2})/);
    if (t) time = `${t[1].padStart(2, "0")}:${t[2]}`;
    const title = get(col("NASLOV"));
    if (!title) return;
    const s = get(col("STATUS")).toUpperCase();
    const status: Status = s === "PUBLISHED" || s === "DONE" ? "published" : s === "SCRAPED" ? "scraped" : s === "FILMED" ? "filmed" : "not_filmed";
    const notes = [get(col("NAPOMENA")), ...extra.map(get)].filter(Boolean).join("\n");
    const { reference, rest } = splitReference(notes);
    const body = get(col("OPIS"));
    const urlOnly = /^https?:\/\/\S+$/.test(body);
    out.push({
      order: i,
      status,
      time,
      title,
      on_camera: person(get(col("OSOBA"))),
      profile: profileOf(get(col("PLATFORM"))),
      script: urlOnly ? [] : textToSections(body),
      note: rest || null,
      reference_url: urlOnly ? body : reference,
    });
  });
  return out;
}

async function main() {
  const all = await tabs();
  const shoots: Shoot[] = [];
  for (const tab of all.filter((x) => isoFrom(x.name))) {
    shoots.push({ date: isoFrom(tab.name)!, location: tab.name.match(/\[(.+?)\]/)?.[1] ?? null, videos: parseShoot(await csv(tab.gid)) });
  }
  shoots.sort((a, b) => a.date.localeCompare(b.date));
  const recent = new Set(shoots.slice(-KEEP_IDEAS_FROM).map((s) => s.date));

  // Not filmed: only from the latest shoots, and only on the last shoot it was planned for.
  for (const s of shoots) {
    s.videos = s.videos.filter((v) => {
      if (v.status !== "not_filmed") return true;
      if (!recent.has(s.date)) return false;
      return !shoots.some((o) => o.date > s.date && o.videos.some((w) => w.status === "not_filmed" && key(w.title) === key(v.title)));
    });
  }

  let notes: string | null = null;
  const guide = all.find((x) => x.name === "UPUTSTVO");
  if (guide) {
    const rows = parseCsv(await csv(guide.gid));
    const start = rows.findIndex((r) => r[0]?.trim() === "Content pillars");
    const end = rows.findIndex((r, i) => i > start && r[0]?.trim() === "Content platform");
    if (start >= 0 && end > start) notes = ["Content pillars:", ...rows.slice(start + 1, end).map((r) => `• ${r[0].trim()}: ${r[1]?.trim() ?? ""}`)].join("\n");
  }

  const count = (st: Status) => shoots.reduce((n, s) => n + s.videos.filter((v) => v.status === st).length, 0);
  console.log(`Shoot days: ${shoots.length}`);
  console.log(`Videos: published ${count("published")}, filmed (no date) ${count("filmed")}, not filmed (bank) ${count("not_filmed")}, dropped ${count("scraped")}`);
  for (const s of shoots) {
    console.log(`  ${s.date} ${s.location ?? ""}`);
    for (const v of s.videos) console.log(`    ${v.status.padEnd(11)} ${(v.profile ?? "—").padEnd(21)} ${v.title}`);
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

  const profiles = must(await supabase.from("profiles").select("id, email"), "profiles");
  const by = (prefix: string) => {
    const p = profiles.find((x) => x.email?.startsWith(prefix));
    if (!p) throw new Error(`No profile for ${prefix}slatenframe.com`);
    return p;
  };
  const [relja, marko] = [by("relja@"), by("marko@")];
  const existing = must(await supabase.from("clients").select("id").eq("name", CLIENT_NAME), "clients");
  if (existing.length) throw new Error(`"${CLIENT_NAME}" already exists — delete it first to re-import.`);

  const clientId = crypto.randomUUID();
  must(
    await supabase
      .from("clients")
      .insert({
        id: clientId,
        name: CLIENT_NAME,
        status: "active",
        services: ["Social media", "Video"],
        profiles: [IG, TT],
        content_types: [],
        locations: [...new Set(shoots.map((s) => s.location).filter((x): x is string => !!x))],
        notes,
        since: shoots[0]?.date ?? null,
      })
      .select("id"),
    "client",
  );
  must(
    await supabase
      .from("client_members")
      .insert([
        { client_id: clientId, user_id: relja.id, role: "manager" as const },
        { client_id: clientId, user_id: marko.id, role: "manager" as const },
      ])
      .select("user_id"),
    "team",
  );

  let n = 0;
  for (const s of shoots) {
    const day = must(
      await supabase.from("shoot_days").insert({ client_id: clientId, date: s.date, location: s.location, created_by: relja.id }).select("id").single(),
      "shoot day",
    );
    for (const v of s.videos) {
      const shot = v.status !== "not_filmed";
      const task = must(
        await supabase
          .from("tasks")
          .insert({
            kind: "video",
            client_id: clientId,
            title: v.title,
            profile: v.profile,
            on_camera: v.on_camera,
            location: s.location,
            script: v.script,
            note: v.note,
            reference_url: v.reference_url,
            shoot_id: day.id,
            shoot_time: v.time,
            shoot_order: v.order,
            shot_status: shot ? "shot" : s.date < "2026-10-03" ? "not_shot" : "to_shoot",
            phase: v.status === "published" ? 5 : shot ? 2 : 1,
            published_at: v.status === "published" ? s.date : null,
            dropped_at: v.status === "scraped" ? s.date : null,
            created_by: relja.id,
            created_at: `${s.date}T12:00:00+02:00`,
          })
          .select("id")
          .single(),
        v.title,
      );
      if (v.status === "published" || v.status === "scraped") {
        const at = `${s.date}T12:00:00+02:00`;
        must(await supabase.from("tasks").update({ completed_at: at, status_changed_at: at }).eq("id", task.id).select("id"), "history date");
      }
      n++;
    }
  }
  console.log(`Imported ${CLIENT_NAME}: ${shoots.length} shoot days, ${n} videos.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
