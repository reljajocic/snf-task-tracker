"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  PRIORITIES,
  STATUSES,
  TASK_SELECT,
  TASK_TYPES,
  toTask,
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
  return out;
}

function refresh() {
  revalidatePath("/", "layout");
}

export async function createTask(
  input: TaskPatch & { title: string; assignee_ids: string[] },
): Promise<ActionResult<{ id: string }>> {
  await requireProfile();
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
  }
  refresh();
  return { ok: true, data: { id: data.id } };
}

export async function updateTask(id: string, patch: TaskPatch): Promise<ActionResult> {
  await requireProfile();
  const fields = clean(patch);
  if (fields.title === "") return { ok: false, error: "Title is required." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").update(fields).eq("id", id).select("id");
  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: false, error: "You can't edit this task." };
  refresh();
  return { ok: true, data: null };
}

export async function setAssignees(id: string, userIds: string[]): Promise<ActionResult> {
  await requireProfile();
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
  return { ok: true, data: null };
}

export async function deleteComment(commentId: string): Promise<ActionResult> {
  await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("task_comments").delete().eq("id", commentId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}
