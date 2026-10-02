"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireProfile } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { createClient } from "@/lib/supabase/server";
import {
  PRIORITIES,
  STATUSES,
  TASK_SELECT,
  TASK_TYPES,
  toTask,
  type ScriptSection,
  type ShotStatus,
  type RawTask,
  type Task,
  type TaskPriority,
  type TaskStatus,
  type TaskType,
} from "@/lib/tasks";

// Every write goes through RLS with the user's own session; these actions only
// validate shape. Permission errors from Postgres come back as { ok: false }.

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };

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
  script: ScriptSection[];
  reference_url: string | null;
  note: string | null;
  publish_date: string | null;
  shoot_id: string | null;
  shoot_time: string | null;
}>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function clean(patch: TaskPatch): TaskPatch {
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
  const textField = (k: "content_type" | "on_camera" | "location" | "reference_url" | "note") => {
    if (patch[k] !== undefined) out[k] = patch[k]?.trim() || null;
  };
  textField("content_type");
  textField("on_camera");
  textField("location");
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
  return out;
}

function refresh() {
  revalidatePath("/", "layout");
}

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  waiting_client: "Waiting on client",
  done: "Done",
};

/** Assignees + creator: the people who care about changes to a task. */
async function watchers(taskId: string): Promise<string[]> {
  const supabase = await createClient();
  const [{ data: task }, { data: assignees }] = await Promise.all([
    supabase.from("tasks").select("created_by").eq("id", taskId).maybeSingle(),
    supabase.from("task_assignees").select("user_id").eq("task_id", taskId),
  ]);
  return [...(assignees ?? []).map((a) => a.user_id), ...(task?.created_by ? [task.created_by] : [])];
}

export async function createTask(
  input: TaskPatch & { title: string; assignee_ids: string[] },
): Promise<ActionResult<{ id: string }>> {
  const me = await requireProfile();
  const fields = clean(input);
  if (!fields.title) return { ok: false, error: "Title is required." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").insert(fields).select("id").single();
  if (error) return { ok: false, error: error.message };

  if (input.assignee_ids.length) {
    const { error: aErr } = await supabase
      .from("task_assignees")
      .insert(input.assignee_ids.map((user_id) => ({ task_id: data.id, user_id })));
    if (aErr) return { ok: false, error: aErr.message };
    after(() => notify({ event: "task_assigned", taskId: data.id, recipientIds: input.assignee_ids, actorId: me.id }));
  }
  refresh();
  return { ok: true, data: { id: data.id } };
}

export async function updateTask(id: string, patch: TaskPatch): Promise<ActionResult> {
  const me = await requireProfile();
  const fields = clean(patch);
  if (fields.title === "") return { ok: false, error: "Title is required." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").update(fields).eq("id", id).select("id");
  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: false, error: "You can't edit this task." };
  if (fields.status) {
    const status = fields.status;
    const recipients = await watchers(id);
    after(() => notify({ event: "task_status_changed", taskId: id, recipientIds: recipients, actorId: me.id, extra: { status: STATUS_LABEL[status] } }));
  }
  refresh();
  return { ok: true, data: null };
}

export async function setAssignees(id: string, userIds: string[]): Promise<ActionResult> {
  const me = await requireProfile();
  const supabase = await createClient();
  const { data: current, error } = await supabase
    .from("task_assignees")
    .select("user_id")
    .eq("task_id", id);
  if (error) return { ok: false, error: error.message };

  const have = new Set((current ?? []).map((r) => r.user_id));
  const want = new Set(userIds);
  const add = [...want].filter((u) => !have.has(u));
  const remove = [...have].filter((u) => !want.has(u));

  if (add.length) {
    const { error: e } = await supabase
      .from("task_assignees")
      .insert(add.map((user_id) => ({ task_id: id, user_id })));
    if (e) return { ok: false, error: e.message };
    after(() => notify({ event: "task_assigned", taskId: id, recipientIds: add, actorId: me.id }));
  }
  if (remove.length) {
    const { error: e } = await supabase
      .from("task_assignees")
      .delete()
      .eq("task_id", id)
      .in("user_id", remove);
    if (e) return { ok: false, error: e.message };
  }
  refresh();
  return { ok: true, data: null };
}

export async function deleteTask(id: string): Promise<ActionResult> {
  await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").delete().eq("id", id).select("id");
  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: false, error: "You can't delete this task." };
  refresh();
  return { ok: true, data: null };
}

export type TaskComment = {
  id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  author: { id: string; full_name: string; initials: string; avatar_bg: string; avatar_fg: string } | null;
};

export type TaskDetail = {
  task: Task;
  comments: TaskComment[];
  creatorName: string | null;
  canEdit: boolean;
  canDelete: boolean;
};

export async function loadTask(id: string): Promise<ActionResult<TaskDetail>> {
  const me = await requireProfile();
  const supabase = await createClient();

  const [{ data: raw, error }, { data: comments }] = await Promise.all([
    supabase.from("tasks").select(TASK_SELECT).eq("id", id).maybeSingle<RawTask>(),
    supabase
      .from("task_comments")
      .select("id, body, created_at, edited_at, author:profiles(id, full_name, initials, avatar_bg, avatar_fg)")
      .eq("task_id", id)
      .order("created_at")
      .returns<TaskComment[]>(),
  ]);
  if (error) return { ok: false, error: error.message };
  if (!raw) return { ok: false, error: "not_found" };

  const task = toTask(raw);
  const [{ data: creator }, managerRes] = await Promise.all([
    task.created_by
      ? supabase.from("profiles").select("full_name").eq("id", task.created_by).maybeSingle()
      : Promise.resolve({ data: null }),
    task.client
      ? supabase
          .from("client_members")
          .select("role")
          .eq("client_id", task.client.id)
          .eq("user_id", me.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const isAdmin = me.role === "admin";
  const isManager = managerRes.data?.role === "manager";
  const isCreator = task.created_by === me.id;
  const isAssignee = task.assignees.some((a) => a.id === me.id);

  return {
    ok: true,
    data: {
      task,
      comments: comments ?? [],
      creatorName: creator?.full_name ?? null,
      canEdit: isAdmin || isManager || isCreator || isAssignee,
      canDelete: isAdmin || isManager || isCreator,
    },
  };
}

export async function addComment(taskId: string, body: string): Promise<ActionResult> {
  const me = await requireProfile();
  const text = body.trim();
  if (!text) return { ok: false, error: "Empty comment." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("task_comments")
    .insert({ task_id: taskId, author_id: me.id, body: text });
  if (error) return { ok: false, error: error.message };
  const recipients = await watchers(taskId);
  after(() => notify({ event: "task_commented", taskId, recipientIds: recipients, actorId: me.id, extra: { body: text.slice(0, 280) } }));
  return { ok: true, data: null };
}

export async function deleteComment(commentId: string): Promise<ActionResult> {
  await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("task_comments").delete().eq("id", commentId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export async function addSubtask(
  parentId: string,
  input: { title: string; assignee_id: string | null; due_date: string | null },
): Promise<ActionResult<{ id: string }>> {
  const me = await requireProfile();
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Title is required." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({ title, parent_id: parentId, kind: "subtask", due_date: input.due_date && DATE_RE.test(input.due_date) ? input.due_date : null })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  if (input.assignee_id) {
    await supabase.from("task_assignees").insert({ task_id: data.id, user_id: input.assignee_id });
    const assignee = input.assignee_id;
    after(() => notify({ event: "task_assigned", taskId: data.id, recipientIds: [assignee], actorId: me.id }));
  }
  refresh();
  return { ok: true, data: { id: data.id } };
}

export async function listSubtasks(parentId: string): Promise<Task[]> {
  await requireProfile();
  const supabase = await createClient();
  const { data } = await supabase.from("tasks").select(TASK_SELECT).eq("parent_id", parentId).order("created_at").returns<RawTask[]>();
  return (data ?? []).map(toTask);
}

/** On set: mark a video shot / not shot (crew can do this without full edit rights). */
export async function setShotStatus(taskId: string, status: ShotStatus): Promise<ActionResult> {
  await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_shot", { tid: taskId, new_status: status });
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, data: null };
}
