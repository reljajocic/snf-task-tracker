// One-off import of Moto Milano Centar (Instagram profiles Kymco Srbija and QJ Srbija) from the
// team's single Google Sheet: a posting schedule per profile, shoot day tabs, two idea lists.
//
//   npm run import:motomilano               # dry run
//   npm run import:motomilano -- --write
//
// Team (Relja, 2026-10-03): Marko and Relja manage, Uroš edits reels, Marko makes posts/carousels.
import { createClient } from "@supabase/supabase-js";
import { parseArgs } from "node:util";
import { addDays } from "@/lib/dates";
import { pickEditor, type EditorRule } from "@/lib/editor-rules";
import { splitReference, textToSections } from "@/lib/script-text";
import { parseCsv, parseShootSheet, type SheetVideo } from "@/lib/sheet-import";

const FILE = "19w9pGZZy3QrUAZ49K57gNVx6VlYmOCWbwUAp_-4pD5w";
const CLIENT_NAME = "Moto Milano Centar";
const KYMCO = "Kymco Srbija";
const QJ = "QJ Srbija";

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
const normType = (s: string) => {
  const t = s.replace(/\s+/g, " ").trim().toUpperCase();
  if (!t) return null;
  if (t.includes("CARO")) return "CAROUSEL";
  if (t.includes("POST")) return "POST";
  return t;
};
const person = (s: string) => (s.trim() && s.trim().toUpperCase() !== "N/A" ? s.trim() : null);
const profileOf = (title: string) => (/^(qj|srt|srk|tara)\b/i.test(title.trim()) ? QJ : /^kymco\b/i.test(title.trim()) ? KYMCO : null);

/** Rows under the header row (the one with NASLOV), as header → value maps. */
function table(text: string) {
  const rows = parseCsv(text);
  const h = rows.findIndex((r) => r.some((c) => c.trim().toUpperCase() === "NASLOV"));
  if (h < 0) return [];
  const head = rows[h].map((c) => c.trim().toUpperCase().split("/")[0]);
  return rows.slice(h + 1).map((r) => {
    const get = (name: string) => {
      const i = head.findIndex((c) => c === name);
      return i >= 0 ? (r[i] ?? "").trim() : "";
    };
    return { get, title: get("NASLOV") };
  });
}

type Planned = {
  title: string;
  profile: string | null;
  content_type: string | null;
  on_camera: string | null;
  script: { label: string; text: string }[];
  note: string | null;
  reference_url: string | null;
  shoot: { date: string; video: SheetVideo } | null;
  outcome: { kind: "published" | "edit"; date: string } | { kind: "ready" } | { kind: "idea" };
};

async function main() {
  const all = await tabs();
  const out: Planned[] = [];

  // Shoot days (tab names like "01. 09. 2026. [Salon]").
  const shoots: { date: string; location: string | null; videos: SheetVideo[] }[] = [];
  for (const tab of all.filter((x) => isoFrom(x.name))) {
    const parsed = parseShootSheet(await csv(tab.gid));
    shoots.push({ date: parsed.date ?? isoFrom(tab.name)!, location: tab.name.match(/\[(.+?)\]/)?.[1] ?? null, videos: parsed.videos });
  }
  const pool = shoots.flatMap((s) => s.videos.filter((v) => v.title.trim()).map((v) => ({ date: s.date, video: v, used: false })));

  // Posting schedules, one per profile.
  for (const tab of all.filter((x) => x.name.startsWith("RASPORED"))) {
    const profile = tab.name.includes("QJ") ? QJ : KYMCO;
    for (const row of table(await csv(tab.gid))) {
      if (!row.title) continue;
      const date = isoFrom(row.get("DATUM"));
      const status = row.get("STATUS").toUpperCase();
      if (!date || !status) continue;
      const type = normType(row.get("TIP"));
      const match = pool.find((p) => !p.used && key(p.video.title) === key(row.title) && normType(p.video.type) === type);
      if (match) match.used = true;
      const { reference, rest } = splitReference(row.get("NAPOMENA"));
      out.push({
        title: row.title,
        profile,
        content_type: type,
        on_camera: person(row.get("OSOBA")),
        script: match?.video.script.length ? match.video.script : textToSections(row.get("OPIS")),
        note: (match?.video.note ?? rest) || null,
        reference_url: match?.video.reference ?? reference,
        shoot: match ? { date: match.date, video: match.video } : null,
        outcome: { kind: status === "PUBLISHED" || status === "DONE" ? "published" : "edit", date },
      });
    }
  }

  // Filmed on a shoot but not scheduled yet.
  for (const p of pool.filter((x) => !x.used)) {
    out.push({
      title: p.video.title.trim(),
      profile: profileOf(p.video.title),
      content_type: normType(p.video.type),
      on_camera: person(p.video.person),
      script: p.video.script,
      note: p.video.note || null,
      reference_url: p.video.reference,
      shoot: { date: p.date, video: p.video },
      outcome: p.video.status === "shot" ? { kind: "ready" } : { kind: "idea" },
    });
  }

  // Idea lists ("IDEJE [Kymco]" / "IDEJE [QJ]").
  for (const tab of all.filter((x) => x.name.startsWith("IDEJE"))) {
    const profile = tab.name.includes("QJ") ? QJ : KYMCO;
    for (const row of table(await csv(tab.gid))) {
      if (!row.title) continue;
      const text = row.get("OPIS");
      const urlOnly = /^https?:\/\/\S+$/.test(text);
      const { reference, rest } = splitReference(row.get("NAPOMENA"));
      const pillar = row.get("STUB");
      out.push({
        title: row.title,
        profile,
        content_type: normType(row.get("TIP")),
        on_camera: person(row.get("OSOBA")),
        script: urlOnly ? [] : textToSections(text),
        note: [pillar && `Pillar: ${pillar}`, rest].filter(Boolean).join("\n") || null,
        reference_url: urlOnly ? text : reference,
        shoot: null,
        outcome: { kind: "idea" },
      });
    }
  }

  // Content pillars from the instructions tab go into the client's notes.
  const guide = all.find((x) => x.name === "UPUTSTVO");
  let notes: string | null = null;
  if (guide) {
    const rows = parseCsv(await csv(guide.gid));
    const start = rows.findIndex((r) => r[0]?.trim() === "Content pillars");
    const end = rows.findIndex((r, i) => i > start && r[0]?.trim() === "Content types");
    if (start >= 0 && end > start) {
      notes = ["Content pillars:", ...rows.slice(start + 1, end).map((r) => `• ${r[0].trim()}: ${r[1]?.trim() ?? ""}`)].join("\n");
    }
  }

  const count = (k: string) => out.filter((v) => v.outcome.kind === k).length;
  console.log(`Shoot days: ${shoots.map((s) => `${s.date} ${s.location ?? ""}`).join(", ")}`);
  console.log(`Posts/videos: ${out.length} — published ${count("published")}, in edit ${count("edit")}, shot without date ${count("ready")}, ideas ${count("idea")}`);
  for (const v of out) {
    const o = v.outcome;
    const when = "date" in o ? `${o.kind} ${o.date}` : o.kind;
    console.log(`  ${when.padEnd(20)} ${(v.profile ?? "—").padEnd(13)} ${(v.content_type ?? "").padEnd(9)} ${v.title}`);
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
  const by = (prefix: string) => {
    const p = profiles.find((x) => x.email?.startsWith(prefix));
    if (!p) throw new Error(`No profile for ${prefix}slatenframe.com`);
    return p;
  };
  const [relja, marko, uros] = [by("relja@"), by("marko@"), by("uros@")];
  const existing = must(await supabase.from("clients").select("id").eq("name", CLIENT_NAME), "clients");
  if (existing.length) throw new Error(`"${CLIENT_NAME}" already exists — delete it first to re-import.`);

  const rules: EditorRule[] = [
    { editor_id: uros.id, days: [], types: ["REEL"] },
    { editor_id: marko.id, days: [], types: ["POST", "CAROUSEL"] },
  ];
  const clientId = crypto.randomUUID();
  must(
    await supabase
      .from("clients")
      .insert({
        id: clientId,
        name: CLIENT_NAME,
        status: "active",
        services: ["Social media", "Video"],
        profiles: [KYMCO, QJ],
        content_types: ["REEL", "POST", "CAROUSEL"],
        posting_days: [0, 2, 4],
        locations: [...new Set(shoots.map((s) => s.location).filter((x): x is string => !!x))],
        editor_rules: rules,
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
        { client_id: clientId, user_id: uros.id, role: "member" as const },
      ])
      .select("user_id"),
    "team",
  );

  const shootIds = new Map<string, string>();
  for (const s of shoots) {
    const row = must(
      await supabase.from("shoot_days").insert({ client_id: clientId, date: s.date, location: s.location, created_by: relja.id }).select("id").single(),
      "shoot day",
    );
    shootIds.set(s.date, row.id);
  }

  for (const v of out) {
    const o = v.outcome;
    const dated = o.kind === "published" || o.kind === "edit" ? o.date : null;
    const editor = o.kind === "edit" ? pickEditor(rules, null, o.date, v.content_type) : null;
    const shot = o.kind !== "idea";
    const task = must(
      await supabase
        .from("tasks")
        .insert({
          kind: "video",
          client_id: clientId,
          title: v.title,
          profile: v.profile,
          content_type: v.content_type,
          on_camera: v.on_camera,
          location: v.shoot ? shoots.find((s) => s.date === v.shoot!.date)?.location ?? null : null,
          script: v.script,
          note: v.note,
          reference_url: v.reference_url,
          shoot_id: v.shoot ? shootIds.get(v.shoot.date)! : null,
          shoot_time: v.shoot?.video.time ?? null,
          shoot_order: v.shoot?.video.order ?? null,
          shot_status: v.shoot ? v.shoot.video.status : shot ? "shot" : "to_shoot",
          phase: o.kind === "published" ? 5 : shot ? 2 : 0,
          publish_date: dated,
          published_at: o.kind === "published" ? o.date : null,
          due_date: editor && dated ? addDays(dated, -1) : null,
          created_by: relja.id,
        })
        .select("id")
        .single(),
      v.title,
    );
    if (editor) must(await supabase.from("task_assignees").insert({ task_id: task.id, user_id: editor }).select("task_id"), "assignee");
    if (o.kind === "published") {
      const at = `${o.date}T12:00:00+02:00`;
      must(await supabase.from("tasks").update({ completed_at: at, status_changed_at: at }).eq("id", task.id).select("id"), "history date");
    }
  }
  console.log(`Imported ${CLIENT_NAME}: ${shoots.length} shoot day(s), ${out.length} posts/videos.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
