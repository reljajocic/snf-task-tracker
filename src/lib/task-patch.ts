import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { after } from "next/server";
import { addDays } from "@/lib/dates";
import { parseEditorRules, pickEditor } from "@/lib/editor-rules";
import { notify } from "@/lib/notify";
import type { Database } from "@/lib/supabase/database.types";
import { PRIORITIES, STATUSES, TASK_TYPES, type ScriptSection, type ShotStatus, type TaskPriority, type TaskStatus, type TaskType } from "@/lib/tasks";

// Shared by the app's server actions and the MCP endpoint: what a task/video write may contain,
// and what happens when a video gets a posting date. Writes still go through RLS with the caller's session.

export type TaskPatch = Partial<{
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType | null;
  due_date: string | null;
  estimate_minutes: number | null;
  drive_url: string | null;
  client_id: string | null;
  project_id: string | null;
  position: number;
  // Videos
  kind: "task" | "video";
  phase: number;
  content_type: string | null;
  on_camera: string | null;
  location: string | null;
  profile: string | null;
  script: ScriptSection[];
  reference_url: string | null;
  note: string | null;
  publish_date: string | null;
  shoot_id: string | null;
  shoot_time: string | null;
  dropped_at: string | null;
  shot_status: ShotStatus;
}>;

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function clean(patch: TaskPatch): TaskPatch {
  const out: TaskPatch = {};
  if (patch.title !== undefined) out.title = patch.title.trim();
  if (patch.description !== undefined) out.description = patch.description?.trim() || null;
  if (patch.status !== undefined && STATUSES.includes(patch.status)) out.status = patch.status;
  if (patch.priority !== undefined && PRIORITIES.includes(patch.priority)) out.priority = patch.priority;
  if (patch.type !== undefined) out.type = patch.type && TASK_TYPES.includes(patch.type) ? patch.type : null;
  if (patch.due_date !== undefined) out.due_date = patch.due_date && DATE_RE.test(patch.due_date) ? patch.due_date : null;
  if (patch.estimate_minutes !== undefined) {
    const m = patch.estimate_minutes;
    out.estimate_minutes = m && Number.isFinite(m) && m > 0 ? Math.round(m) : null;
  }
  if (patch.drive_url !== undefined) out.drive_url = patch.drive_url?.trim() || null;
  if (patch.client_id !== undefined) out.client_id = patch.client_id || null;
  if (patch.project_id !== undefined) out.project_id = patch.project_id || null;
  if (patch.position !== undefined && Number.isFinite(patch.position)) out.position = patch.position;
  if (patch.kind !== undefined) out.kind = patch.kind === "video" ? "video" : "task";
  if (patch.phase !== undefined && Number.isInteger(patch.phase) && patch.phase >= 0 && patch.phase <= 5) out.phase = patch.phase;
  const textField = (k: "content_type" | "on_camera" | "location" | "profile" | "reference_url" | "note") => {
    if (patch[k] !== undefined) out[k] = patch[k]?.trim() || null;
  };
  textField("content_type");
  textField("on_camera");
  textField("location");
  textField("profile");
  textField("reference_url");
  textField("note");
  if (patch.script !== undefined) {
    out.script = (Array.isArray(patch.script) ? patch.script : [])
      .map((x) => ({ label: String(x.label ?? "").trim().slice(0, 40), text: String(x.text ?? "") }))
      .filter((x) => x.label || x.text.trim())
      .slice(0, 20);
  }
  if (patch.publish_date !== undefined) out.publish_date = patch.publish_date && DATE_RE.test(patch.publish_date) ? patch.publish_date : null;
  if (patch.shoot_id !== undefined) out.shoot_id = patch.shoot_id || null;
  if (patch.shoot_time !== undefined) out.shoot_time = patch.shoot_time && /^\d{2}:\d{2}$/.test(patch.shoot_time) ? patch.shoot_time : null;
  if (patch.shot_status !== undefined && ["to_shoot", "shot", "not_shot"].includes(patch.shot_status)) out.shot_status = patch.shot_status;
  if (patch.dropped_at !== undefined) out.dropped_at = patch.dropped_at && DATE_RE.test(patch.dropped_at) ? patch.dropped_at : null;
  return out;
}

/**
 * A video got a posting date: the client's editor for that day/type (see editor-rules) gets the edit work (if not already on it),
 * with a deadline the day before posting unless one is set.
 */
export async function handOffToEditor(supabase: SupabaseClient<Database>, taskId: string, publishDate: string, actorId: string) {
  const { data: task } = await supabase
    .from("tasks")
    .select("kind, due_date, content_type, client:clients(default_editor_id, editor_rules), task_assignees(user_id)")
    .eq("id", taskId)
    .single<{
      kind: string;
      due_date: string | null;
      content_type: string | null;
      client: { default_editor_id: string | null; editor_rules: unknown } | null;
      task_assignees: { user_id: string }[];
    }>();
  const editor =
    task?.client && pickEditor(parseEditorRules(task.client.editor_rules), task.client.default_editor_id, publishDate, task.content_type);
  if (!task || task.kind !== "video" || !editor) return;
  if (!task.due_date) await supabase.from("tasks").update({ due_date: addDays(publishDate, -1) }).eq("id", taskId);
  if (task.task_assignees.some((a) => a.user_id === editor)) return;
  await supabase.from("task_assignees").insert({ task_id: taskId, user_id: editor });
  after(() => notify({ event: "task_assigned", taskId, recipientIds: [editor], actorId }));
}

