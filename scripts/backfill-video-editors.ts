// One-off (2026-10-14): videos had a loose list of people; now they have one editor.
// For each video with people on it: the editor the client's rules pick, if they're on it;
// otherwise the only person on it; otherwise none. Dry run by default; pass --apply to write.
//   JITI_FS_CACHE=false node --env-file=.env.local node_modules/jiti/lib/jiti-cli.mjs scripts/backfill-video-editors.ts [--apply]
import { createClient } from "@supabase/supabase-js";
import { parseEditorRules, pickEditor } from "../src/lib/editor-rules";

const apply = process.argv.includes("--apply");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);

type Row = {
  id: string;
  title: string;
  publish_date: string | null;
  content_type: string | null;
  editor_id: string | null;
  client: { name: string; default_editor_id: string | null; editor_rules: unknown } | null;
  task_assignees: { user_id: string }[];
};

const { data: people } = await db.from("profiles").select("id, full_name");
const name = (id: string | null) => (id ? (people ?? []).find((p) => p.id === id)?.full_name ?? id : "—");
const { data, error } = await db
  .from("tasks")
  .select("id, title, publish_date, content_type, editor_id, client:clients(name, default_editor_id, editor_rules), task_assignees(user_id)")
  .eq("kind", "video")
  .is("editor_id", null)
  .returns<Row[]>();
if (error) throw error;

let set = 0;
for (const v of data ?? []) {
  const on = v.task_assignees.map((a) => a.user_id);
  if (!on.length) continue;
  const byRule =
    v.publish_date && v.client ? pickEditor(parseEditorRules(v.client.editor_rules), v.client.default_editor_id, v.publish_date, v.content_type) : null;
  const editor = byRule && on.includes(byRule) ? byRule : on.length === 1 ? on[0] : null;
  console.log(`${v.client?.name} | ${v.title} | ${v.publish_date ?? "no date"} | on it: ${on.map(name).join(", ")} → editor: ${name(editor)}`);
  if (!editor) continue;
  set++;
  if (apply) {
    const { error: e } = await db.from("tasks").update({ editor_id: editor }).eq("id", v.id);
    if (e) throw e;
  }
}
console.log(`${apply ? "Set" : "Would set"} ${set} editors.`);
