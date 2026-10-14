import "server-only";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { today } from "@/lib/dates";
import { notify } from "@/lib/notify";
import { sectionsToText, textToSections } from "@/lib/script-text";
import { returnToIdeas } from "@/lib/reshoot";
import { clean, handOffToEditor, type TaskPatch } from "@/lib/task-patch";
import { canReturnToIdeas, pendingReshoot, PHASES, PUBLISHED_PHASE, type ScriptSection, type ShootAttempt } from "@/lib/tasks";
import type { McpCaller } from "./auth";

// What an AI assistant can do in SNF Dailies: mostly getting videos and scripts in, and saying who's on them.
// Everything runs as the key's owner (RLS), so it can only touch what that person can in the app.

const INSTRUCTIONS = `SNF Dailies is Slate n' Frame's internal tracker for client video content.
- A video belongs to a client. It moves through phases: script → shoot → edit → revision (waiting on the client) → publish → published.
- The video bank holds videos without a posting date: ideas, videos on a shoot day, filmed ones waiting for a date. A posting date makes it scheduled work.
- "on_camera" is the talent (free text, comma-separated names). "editor" is the one team member who edits it (it shows in their tasks; they get notified); it's set automatically by the client's editor rules when the video gets a posting date, unless already set. "shooter" is who films it; empty means the shoot day's crew.
- Scripts are written in the team's format, one part per label: "HOOK: …", "BODY: …", "CTA 1: …", "OPEN LOOP 1: …". Plain text without labels is fine too.
- Clients, people and shoot days can be referred to by name/date or id. Call list_clients / list_people / list_shoots first when unsure.
- Write in the language the client's content is in (usually Serbian, latin script).
- If filmed footage can't be used (weak talent, bad shot, client rejected it), use return_to_ideas with a reason instead of clearing fields by hand: it keeps the attempt in the video's shoot history and marks it "to reshoot".`;

const PHASE_NAMES = [...PHASES, "published"] as const;
type PhaseName = (typeof PHASE_NAMES)[number];

const norm = (s: string) =>
  s.toLowerCase().replace(/đ/g, "dj").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

class ToolError extends Error {}

const ok = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 1) }] });
const fail = (message: string) => ({ content: [{ type: "text" as const, text: message }], isError: true });

/** Runs a tool body, turning ToolError/DB errors into a readable MCP error. */
async function run<T>(fn: () => Promise<T>) {
  try {
    return ok(await fn());
  } catch (e) {
    return fail(e instanceof ToolError ? e.message : `Something went wrong: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** Unique match by id, exact name, or a single partial match; otherwise a helpful error. */
function pick<T extends { id: string }>(items: T[], ref: string, names: (x: T) => string[], what: string): T {
  if (isUuid(ref)) {
    const hit = items.find((x) => x.id === ref);
    if (hit) return hit;
    throw new ToolError(`No ${what} with id ${ref} (or you can't see it).`);
  }
  const q = norm(ref);
  const exact = items.filter((x) => names(x).some((n) => norm(n) === q));
  if (exact.length === 1) return exact[0];
  const partial = exact.length ? exact : items.filter((x) => names(x).some((n) => norm(n).includes(q)));
  if (partial.length === 1) return partial[0];
  const options = (partial.length ? partial : items).slice(0, 30).map((x) => names(x)[0]);
  throw new ToolError(`${partial.length ? "Several" : "No"} ${what}s match "${ref}". ${partial.length ? "Which one" : "Options"}: ${options.join("; ")}`);
}

const scriptInput = z
  .union([z.string(), z.array(z.object({ label: z.string(), text: z.string() }))])
  .describe('Script. Either text in the team format ("HOOK: …\\nBODY: …\\nCTA 1: …") or a list of {label, text} parts.');
const toSections = (s: string | ScriptSection[]) => (typeof s === "string" ? textToSections(s) : s);
const names = z.union([z.string(), z.array(z.string())]);
const list = (v: string | string[]) => (Array.isArray(v) ? v : v.split(",")).map((x) => x.trim()).filter(Boolean);

const videoFields = {
  title: z.string().min(1).max(200).optional(),
  script: scriptInput.optional(),
  content_type: z.string().max(40).optional().describe("Format/type label used for this client, e.g. REEL, FUN, GYM, COMPLEX. See list_clients → content_types."),
  location: z.string().max(80).optional().describe("Where it's filmed (see list_clients → locations)."),
  profile: z.string().max(80).optional().describe("Which of the client's social profiles it's for (see list_clients → profiles)."),
  on_camera: names.optional().describe("Talent in front of the camera (names, free text)."),
  shoot_time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional().describe("HH:MM on the shoot day."),
  publish_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional().describe("Posting date YYYY-MM-DD. Gives the edit to the client's editor."),
  reference_url: z.string().max(500).nullable().optional().describe("Reference video link."),
  note: z.string().max(2000).nullable().optional().describe("Note for the team (shooting notes etc.)."),
};

type VideoInput = {
  title?: string;
  script?: string | ScriptSection[];
  content_type?: string;
  location?: string;
  profile?: string;
  on_camera?: string | string[];
  shoot_time?: string | null;
  publish_date?: string | null;
  reference_url?: string | null;
  note?: string | null;
};

function toPatch(v: VideoInput): TaskPatch {
  const patch: TaskPatch = {};
  if (v.title !== undefined) patch.title = v.title;
  if (v.script !== undefined) patch.script = toSections(v.script);
  if (v.content_type !== undefined) patch.content_type = v.content_type.toUpperCase();
  if (v.location !== undefined) patch.location = v.location;
  if (v.profile !== undefined) patch.profile = v.profile;
  if (v.on_camera !== undefined) patch.on_camera = list(v.on_camera).join(", ");
  if (v.shoot_time !== undefined) patch.shoot_time = v.shoot_time;
  if (v.publish_date !== undefined) patch.publish_date = v.publish_date;
  if (v.reference_url !== undefined) patch.reference_url = v.reference_url;
  if (v.note !== undefined) patch.note = v.note;
  return patch;
}

const phasePatch = (p: PhaseName): TaskPatch => {
  const phase = p === "published" ? PUBLISHED_PHASE : PHASES.indexOf(p);
  return phase >= 2 ? { phase, shot_status: "shot" } : { phase };
};

const VIDEO_COLS = `id, title, content_type, location, profile, on_camera, script, phase, shot_status, publish_date, dropped_at,
  shoot_time, shoot_order, created_at, note, reference_url, drive_url,
  client:clients(id, name), shoot:shoot_days(id, date, location), editor:profiles!tasks_editor_id_fkey(id, full_name), shooter:profiles!tasks_shooter_id_fkey(id, full_name),
  shoot_history:video_shoot_history(shoot_date, location, shoot_time, on_camera, shot_status, publish_date, reason, returned_at, returned_by:profiles(full_name))`;

type VideoRow = {
  id: string;
  title: string;
  content_type: string | null;
  location: string | null;
  profile: string | null;
  on_camera: string | null;
  script: unknown;
  phase: number | null;
  shot_status: string | null;
  publish_date: string | null;
  dropped_at: string | null;
  shoot_time: string | null;
  shoot_order: number | null;
  created_at: string;
  note: string | null;
  reference_url: string | null;
  drive_url: string | null;
  client: { id: string; name: string } | null;
  shoot: { id: string; date: string; location: string | null } | null;
  editor: { id: string; full_name: string } | null;
  shooter: { id: string; full_name: string } | null;
  shoot_history: ShootAttempt[] | null;
};

const phaseName = (v: VideoRow) => ((v.phase ?? 0) >= PUBLISHED_PHASE ? "published" : PHASES[v.phase ?? 0]);
const scriptOf = (v: VideoRow) => (Array.isArray(v.script) ? (v.script as ScriptSection[]) : []);
const historyOf = (v: VideoRow) => [...(v.shoot_history ?? [])].sort((a, b) => b.returned_at.localeCompare(a.returned_at));
const attemptOut = (a: ShootAttempt) => ({
  shoot_date: a.shoot_date,
  location: a.location,
  time: a.shoot_time,
  on_camera: a.on_camera,
  shot_status: a.shot_status,
  was_posting: a.publish_date,
  reason: a.reason,
  returned_at: a.returned_at,
  returned_by: a.returned_by?.full_name ?? null,
});

function shelf(v: VideoRow) {
  if (v.dropped_at) return "dropped";
  if (v.publish_date || (v.phase ?? 0) >= PUBLISHED_PHASE) return "scheduled";
  if (v.shot_status === "shot" || (v.phase ?? 0) >= 2) return "ready";
  return v.shoot ? "shoot" : "ideas";
}

function summary(v: VideoRow) {
  const first = scriptOf(v).find((s) => s.text?.trim());
  return {
    id: v.id,
    title: v.title,
    client: v.client?.name,
    type: v.content_type,
    location: v.location,
    profile: v.profile,
    on_camera: v.on_camera,
    editor: v.editor?.full_name ?? null,
    shooter: v.shooter?.full_name ?? (v.shoot ? "shooting crew" : null),
    phase: phaseName(v),
    shelf: shelf(v),
    shoot: v.shoot ? { id: v.shoot.id, date: v.shoot.date, location: v.shoot.location, time: v.shoot_time, status: v.shot_status } : null,
    publish_date: v.publish_date,
    reshoot: (() => {
      const p = pendingReshoot({ ...v, shot_status: v.shot_status as "shot" | null, shoot_id: v.shoot?.id ?? null, shoot_history: historyOf(v) });
      return p ? { reason: p.reason, filmed_on: p.shoot_date } : null;
    })(),
    shoot_attempts: v.shoot_history?.length ?? 0,
    script_start: first ? `${first.label ? `${first.label}: ` : ""}${first.text.slice(0, 140)}` : null,
  };
}

export function buildServer(me: McpCaller) {
  const db = me.supabase;
  const server = new McpServer({ name: "snf-dailies", version: "1.0.0" }, { instructions: INSTRUCTIONS });

  const clients = async () => {
    const { data, error } = await db.from("clients").select("id, name, status, profiles, content_types, locations").order("name");
    if (error) throw error;
    return data ?? [];
  };
  const people = async () => {
    const { data, error } = await db.from("profiles").select("id, full_name, initials, email, is_active").eq("is_active", true).order("full_name");
    if (error) throw error;
    return data ?? [];
  };
  const client = async (ref: string) => pick(await clients(), ref, (c) => [c.name], "client");
  const peopleIds = async (refs: string[]) => {
    const all = await people();
    return [...new Set(refs.map((r) => pick(all, r, (p) => [p.full_name, p.email, p.initials, p.full_name.split(" ")[0]], "person").id))];
  };
  const shoot = async (ref: string, clientId?: string) => {
    let q = db.from("shoot_days").select("id, date, location, client_id, client:clients(name)").order("date", { ascending: false }).limit(200);
    if (clientId) q = q.eq("client_id", clientId);
    const { data, error } = await q.returns<{ id: string; date: string; location: string | null; client_id: string; client: { name: string } | null }[]>();
    if (error) throw error;
    return pick(data ?? [], ref, (s) => [`${s.date}${s.location ? ` ${s.location}` : ""}${s.client ? ` (${s.client.name})` : ""}`, s.date], "shoot day");
  };
  const loadVideo = async (id: string) => {
    const { data, error } = await db.from("tasks").select(VIDEO_COLS).eq("id", id).eq("kind", "video").maybeSingle<VideoRow>();
    if (error) throw error;
    if (!data) throw new ToolError(`No video with id ${id} (or you can't see it).`);
    return data;
  };
  /** Sets who edits a video and tells them, like picking the editor in the app. */
  const setEditor = async (taskId: string, editorId: string | null) => {
    const { error } = await db.from("tasks").update({ editor_id: editorId }).eq("id", taskId);
    if (error) throw error;
    if (editorId) after(() => notify({ event: "task_assigned", taskId, recipientIds: [editorId], actorId: me.userId }));
  };
  const person = async (ref: string | null) => (ref ? (await peopleIds([ref]))[0] : null);
  const nextShootOrder = async (shootId: string) => {
    const { data } = await db.from("tasks").select("shoot_order").eq("shoot_id", shootId).not("shoot_order", "is", null).order("shoot_order", { ascending: false }).limit(1);
    return (data?.[0]?.shoot_order ?? -1) + 1;
  };
  const changed = () => revalidatePath("/", "layout");

  server.registerTool(
    "list_clients",
    {
      title: "List clients",
      description: "Clients you can see, with their social profiles, content types and filming locations (use these exact labels on videos).",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => run(clients),
  );

  server.registerTool(
    "list_people",
    {
      title: "List team members",
      description: "Active SNF team members (for a video's editor and shooter, and shoot crews).",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => run(async () => (await people()).map((p) => ({ id: p.id, name: p.full_name, initials: p.initials, email: p.email }))),
  );

  server.registerTool(
    "list_shoots",
    {
      title: "List shoot days",
      description: "Shoot days, newest first: date, location, client, crew and how many videos are on each.",
      inputSchema: {
        client: z.string().optional().describe("Client name or id."),
        upcoming_only: z.boolean().optional().describe("Only today and later (default false: the last 30 days and everything after)."),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ client: clientRef, upcoming_only }) =>
      run(async () => {
        let q = db
          .from("shoot_days")
          .select("id, date, location, starts_at, ends_at, notes, client:clients(id, name), shoot_crew(profile:profiles(full_name)), tasks(count)")
          .gte("date", upcoming_only ? today() : new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10))
          .order("date", { ascending: false });
        if (clientRef) q = q.eq("client_id", (await client(clientRef)).id);
        const { data, error } = await q.returns<
          {
            id: string;
            date: string;
            location: string | null;
            starts_at: string | null;
            ends_at: string | null;
            notes: string | null;
            client: { id: string; name: string } | null;
            shoot_crew: { profile: { full_name: string } | null }[];
            tasks: { count: number }[];
          }[]
        >();
        if (error) throw error;
        return (data ?? []).map((s) => ({
          id: s.id,
          date: s.date,
          location: s.location,
          hours: s.starts_at ? `${s.starts_at}${s.ends_at ? `–${s.ends_at}` : ""}` : null,
          client: s.client?.name,
          crew: s.shoot_crew.map((c) => c.profile?.full_name).filter(Boolean),
          videos: s.tasks[0]?.count ?? 0,
          notes: s.notes,
        }));
      }),
  );

  server.registerTool(
    "create_shoot",
    {
      title: "Create a shoot day",
      description: "Adds a shoot day for a client. Returns its id, to put videos on it with create_videos / update_video.",
      inputSchema: {
        client: z.string().describe("Client name or id."),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("YYYY-MM-DD"),
        location: z.string().max(80).optional(),
        starts_at: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        ends_at: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        crew: names.optional().describe("Team members filming (names, emails or ids)."),
        notes: z.string().max(2000).optional(),
      },
    },
    async (input) =>
      run(async () => {
        const c = await client(input.client);
        const crew = input.crew ? await peopleIds(list(input.crew)) : [];
        const { data, error } = await db
          .from("shoot_days")
          .insert({ client_id: c.id, date: input.date, location: input.location ?? null, starts_at: input.starts_at ?? null, ends_at: input.ends_at ?? null, notes: input.notes ?? null })
          .select("id")
          .single();
        if (error) throw error;
        if (crew.length) {
          const { error: e } = await db.from("shoot_crew").insert(crew.map((user_id) => ({ shoot_id: data.id, user_id })));
          if (e) throw e;
        }
        changed();
        return { id: data.id, client: c.name, date: input.date, location: input.location ?? null };
      }),
  );

  server.registerTool(
    "list_videos",
    {
      title: "List videos",
      description:
        "A client's videos with phase, shoot, editor, shooter and the start of the script. shelf: ideas (no shoot yet), shoot (on a shoot day, not filmed), ready (filmed, no posting date), scheduled (has a posting date / published), dropped.",
      inputSchema: {
        client: z.string().describe("Client name or id."),
        shelf: z.enum(["all", "ideas", "shoot", "ready", "scheduled", "dropped"]).optional().describe("Default: all except dropped."),
        shoot: z.string().optional().describe("Only videos on this shoot day (id or YYYY-MM-DD)."),
        search: z.string().optional().describe("Words in the title, talent or script."),
        limit: z.number().int().min(1).max(200).optional().describe("Default 60."),
      },
      annotations: { readOnlyHint: true },
    },
    async (input) =>
      run(async () => {
        const c = await client(input.client);
        let q = db.from("tasks").select(VIDEO_COLS).eq("kind", "video").eq("client_id", c.id).order("created_at", { ascending: false }).limit(1000);
        if (input.shoot) q = q.eq("shoot_id", (await shoot(input.shoot, c.id)).id);
        const { data, error } = await q.returns<VideoRow[]>();
        if (error) throw error;
        const needle = input.search ? norm(input.search) : "";
        const want = input.shelf ?? "active";
        const rows = (data ?? [])
          .filter((v) => (want === "all" ? true : want === "active" ? !v.dropped_at : shelf(v) === want))
          .filter((v) => !needle || norm([v.title, v.on_camera ?? "", ...scriptOf(v).map((s) => s.text)].join(" ")).includes(needle));
        if (input.shoot) rows.sort((a, b) => (a.shoot_order ?? 1e9) - (b.shoot_order ?? 1e9) || a.created_at.localeCompare(b.created_at));
        return { client: c.name, total: rows.length, videos: rows.slice(0, input.limit ?? 60).map(summary) };
      }),
  );

  server.registerTool(
    "get_video",
    {
      title: "Get a video",
      description: "One video with its full script (by part), notes, links, shoot, editor and shooter.",
      inputSchema: { id: z.string().describe("Video id.") },
      annotations: { readOnlyHint: true },
    },
    async ({ id }) =>
      run(async () => {
        const v = await loadVideo(id);
        return {
          ...summary(v),
          script_start: undefined,
          script: scriptOf(v),
          script_text: sectionsToText(scriptOf(v)),
          note: v.note,
          reference_url: v.reference_url,
          drive_url: v.drive_url,
          shoot_history: historyOf(v).map(attemptOut),
        };
      }),
  );

  server.registerTool(
    "create_videos",
    {
      title: "Add videos",
      description:
        "Adds one or more videos (with scripts) to a client's video bank. Optionally puts them on a shoot day, says who's on camera, who edits it (notified) and who films it.",
      inputSchema: {
        client: z.string().describe("Client name or id."),
        shoot: z.string().optional().describe("Shoot day for all of them (id or YYYY-MM-DD). Each goes to the end of the running order."),
        videos: z
          .array(
            z.object({
              ...videoFields,
              title: z.string().min(1).max(200),
              editor: z.string().optional().describe("Who edits it (name, email or id). Usually leave out: the client's editor rules pick one when it gets a posting date."),
              shooter: z.string().optional().describe("Who films it, if not the shoot day's crew."),
              phase: z.enum(PHASE_NAMES).optional().describe("Default: script (an idea). Use edit for already filmed, published for already posted."),
            }),
          )
          .min(1)
          .max(40),
      },
    },
    async (input) =>
      run(async () => {
        const c = await client(input.client);
        const s = input.shoot ? await shoot(input.shoot, c.id) : null;
        let order = s ? await nextShootOrder(s.id) : 0;
        const created: { id: string; title: string }[] = [];
        for (const v of input.videos) {
          const [editorId, shooterId] = await Promise.all([person(v.editor ?? null), person(v.shooter ?? null)]);
          const fields = clean({
            ...toPatch(v),
            ...(v.phase ? phasePatch(v.phase) : {}),
            kind: "video",
            client_id: c.id,
            ...(s ? { shoot_id: s.id } : {}),
            ...(shooterId ? { shooter_id: shooterId } : {}),
          });
          const { data, error } = await db
            .from("tasks")
            .insert({ ...fields, title: fields.title!, ...(s ? { shoot_order: order++ } : {}) })
            .select("id")
            .single();
          if (error) throw new ToolError(`"${v.title}" wasn't added: ${error.message}. Added before it: ${created.map((x) => x.title).join(", ") || "none"}.`);
          if (editorId) await setEditor(data.id, editorId);
          if (fields.publish_date) await handOffToEditor(db, data.id, fields.publish_date, me.userId);
          created.push({ id: data.id, title: v.title });
        }
        changed();
        return { client: c.name, shoot: s ? { id: s.id, date: s.date } : null, created };
      }),
  );

  server.registerTool(
    "return_to_ideas",
    {
      title: "Return a video to ideas (reshoot)",
      description:
        "For a video that was put on a shoot day, filmed or scheduled but whose footage can't be used. Sends it back to the Ideas shelf (phase script, off its shoot day, no posting date), keeps this attempt in its shoot history with the reason, marks it 'to reshoot', and tells its editor the edit is off. Script, approvals, editor and shooter stay.",
      inputSchema: {
        id: z.string().describe("Video id."),
        reason: z.string().min(1).max(500).describe("Why it needs a reshoot, e.g. 'weak talent', 'client rejected the shot'."),
      },
      annotations: { destructiveHint: false, idempotentHint: false },
    },
    async ({ id, reason }) =>
      run(async () => {
        const v = await loadVideo(id);
        if (!canReturnToIdeas({ ...v, shot_status: v.shot_status as "shot" | null, shoot_id: v.shoot?.id ?? null })) {
          throw new ToolError(`"${v.title}" is ${v.dropped_at ? "dropped" : (v.phase ?? 0) >= PUBLISHED_PHASE ? "already published" : "already an idea"}; nothing to return.`);
        }
        const res = await returnToIdeas(db, v.id, reason, me.userId);
        if (!res.ok) throw new ToolError(res.error);
        changed();
        const fresh = await loadVideo(v.id);
        return { ...summary(fresh), shoot_history: historyOf(fresh).map(attemptOut) };
      }),
  );

  server.registerTool(
    "update_video",
    {
      title: "Update a video",
      description:
        "Changes a video: title, script, talent, labels, shoot day and time, posting date, phase, editor and shooter. Only the fields you pass change.",
      inputSchema: {
        id: z.string().describe("Video id (from list_videos)."),
        ...videoFields,
        shoot: z.string().nullable().optional().describe("Move to a shoot day (id or YYYY-MM-DD); null takes it off its shoot day."),
        phase: z.enum(PHASE_NAMES).optional(),
        shot_status: z.enum(["to_shoot", "shot", "not_shot"]).optional().describe("On the shoot day."),
        editor: z.string().nullable().optional().describe("Who edits it (name, email or id; they get notified); null clears it."),
        shooter: z.string().nullable().optional().describe("Who films it; null means the shoot day's crew."),
        dropped: z.boolean().optional().describe("true drops the video (kept in the dropped shelf), false brings it back."),
      },
    },
    async (input) =>
      run(async () => {
        const v = await loadVideo(input.id);
        const patch: TaskPatch = { ...toPatch(input), ...(input.phase ? phasePatch(input.phase) : {}) };
        if (input.shot_status) patch.shot_status = input.shot_status;
        if (input.dropped !== undefined) patch.dropped_at = input.dropped ? today() : null;
        // Set before the posting-date hand-off, so an editor named here isn't replaced by the rules.
        const newEditor = input.editor !== undefined ? await person(input.editor) : undefined;
        if (newEditor !== undefined) patch.editor_id = newEditor;
        if (input.shooter !== undefined) patch.shooter_id = await person(input.shooter);
        let shootOrder: number | null | undefined;
        if (input.shoot === null) {
          Object.assign(patch, { shoot_id: null, shoot_time: null, shot_status: "to_shoot" });
          shootOrder = null;
        } else if (input.shoot) {
          const s = await shoot(input.shoot, v.client?.id);
          if (s.id !== v.shoot?.id) {
            Object.assign(patch, { shoot_id: s.id, shot_status: patch.shot_status ?? "to_shoot" });
            shootOrder = await nextShootOrder(s.id);
          }
        }
        const fields = clean(patch);
        if (fields.title === "") throw new ToolError("Title can't be empty.");
        if (Object.keys(fields).length || shootOrder !== undefined) {
          const { data, error } = await db
            .from("tasks")
            .update({ ...fields, ...(shootOrder !== undefined ? { shoot_order: shootOrder } : {}) })
            .eq("id", v.id)
            .select("id");
          if (error) throw error;
          if (!data?.length) throw new ToolError("You can't edit this video.");
          const dated = fields.publish_date ?? (fields.publish_date === undefined ? v.publish_date : null);
          if (dated && (fields.publish_date || fields.shot_status === "shot" || (fields.phase ?? 0) >= 2)) await handOffToEditor(db, v.id, dated, me.userId);
        }

        if (newEditor && newEditor !== v.editor?.id) after(() => notify({ event: "task_assigned", taskId: v.id, recipientIds: [newEditor], actorId: me.userId }));
        changed();
        return summary(await loadVideo(v.id));
      }),
  );

  return server;
}
