"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireProfile } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { createClient } from "@/lib/supabase/server";
import { clean, DATE_RE, handOffToEditor, type TaskPatch } from "@/lib/task-patch";
import { TASK_SELECT, toTask, type RawTask, type ShotStatus, type Task, type TaskStatus } from "@/lib/tasks";

// Every write goes through RLS with the user's own session; these actions only
// validate shape. Permission errors from Postgres come back as { ok: false }.

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };

export type { TaskPatch } from "@/lib/task-patch";

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
  if (fields.publish_date) await handOffToEditor(supabase, id, fields.publish_date, me.id);
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
  author: { id: string; full_name: string; initials: string; avatar_bg: string; avatar_fg: string; avatar_url?: string | null } | null;
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
      .select("id, body, created_at, edited_at, author:profiles(id, full_name, initials, avatar_bg, avatar_fg, avatar_url)")
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

export type VersionInfo = {
  id: string;
  version: number;
  url: string;
  note: string | null;
  created_at: string;
  decision: { status: "approved" | "changes"; approver_name: string; comment: string | null } | null;
};

export type ReviewState = { versions: VersionInfo[]; script: { status: "approved" | "changes"; approver_name: string; comment: string | null } | null };

/** Versions sent to the client, each with the client's latest decision; plus the script decision. */
export async function loadReview(taskId: string): Promise<ReviewState> {
  await requireProfile();
  const supabase = await createClient();
  const [{ data: versions }, { data: approvals }] = await Promise.all([
    supabase.from("video_versions").select("id, version, url, note, created_at").eq("task_id", taskId).order("version", { ascending: false }),
    supabase.from("approvals").select("kind, version_id, status, approver_name, comment, created_at").eq("task_id", taskId).order("created_at", { ascending: false }),
  ]);
  const latest = (pred: (a: NonNullable<typeof approvals>[number]) => boolean) => (approvals ?? []).find(pred) ?? null;
  return {
    versions: (versions ?? []).map((v) => {
      const d = latest((a) => a.kind === "video" && a.version_id === v.id);
      return { ...v, decision: d ? { status: d.status as "approved" | "changes", approver_name: d.approver_name, comment: d.comment } : null };
    }),
    script: (() => {
      const d = latest((a) => a.kind === "script");
      return d ? { status: d.status as "approved" | "changes", approver_name: d.approver_name, comment: d.comment } : null;
    })(),
  };
}

/** New cut for the client: version n+1, video moves to revision (waiting on client). */
export async function addVersion(taskId: string, input: { url: string; note: string; notifyClient: boolean }): Promise<ActionResult> {
  const me = await requireProfile();
  const url = input.url.trim();
  if (!url) return { ok: false, error: "Link is required." };
  const supabase = await createClient();
  const { data: last } = await supabase.from("video_versions").select("version").eq("task_id", taskId).order("version", { ascending: false }).limit(1).maybeSingle();
  const version = (last?.version ?? 0) + 1;
  const { error } = await supabase
    .from("video_versions")
    .insert({ task_id: taskId, version, url: url.startsWith("http") ? url : `https://${url}`, note: input.note.trim() || null, created_by: me.id });
  if (error) return { ok: false, error: error.message };

  const { data: task } = await supabase.from("tasks").select("title, phase, client_id").eq("id", taskId).single();
  if (task && (task.phase ?? 0) < 3) await supabase.from("tasks").update({ phase: 3 }).eq("id", taskId);
  if (task?.client_id) {
    const clientId = task.client_id;
    const title = task.title;
    after(async () => {
      const { createAdminClient } = await import("@/lib/supabase/server");
      await createAdminClient().from("portal_activity").insert({ client_id: clientId, message: `Version ${version} of “${title}” sent for review` });
      if (input.notifyClient) {
        const { emailClient } = await import("@/lib/notify");
        await emailClient({
          clientId,
          subject: `New video to review: ${title}`,
          heading: `A new version of “${title}” is ready for your review`,
          lines: input.note.trim() ? [input.note.trim()] : [],
          path: `/video/${taskId}`,
        });
      }
    });
  }
  refresh();
  return { ok: true, data: null };
}
