"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { notify } from "@/lib/notify";
import { UNDO_WINDOW_MS, getPortal, getPortalVideos } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabase/server";

// Client decisions from the portal. There's no login: the secret token identifies the client,
// and every check below re-validates that the video belongs to that client.

export type PortalResult = { ok: true; approvalId?: string } | { ok: false; error: string };

async function context(token: string, taskId: string) {
  const portal = await getPortal(token);
  if (!portal) return null;
  const [video] = await getPortalVideos(portal.clientId, { id: taskId });
  if (!video) return null;
  return { portal, video };
}

/**
 * Who hears about a client's decision: the client's managers (they run the relationship — ideas
 * and scripts usually have nobody assigned yet), plus whoever is assigned to the video.
 */
async function teamOf(taskId: string) {
  const admin = createAdminClient();
  const { data: task } = await admin.from("tasks").select("client_id").eq("id", taskId).single();
  const [{ data: assignees }, { data: managers }] = await Promise.all([
    admin.from("task_assignees").select("user_id").eq("task_id", taskId),
    admin.from("client_members").select("user_id").eq("client_id", task?.client_id ?? "").eq("role", "manager"),
  ]);
  return [...new Set([...(managers ?? []), ...(assignees ?? [])].map((a) => a.user_id))];
}

function cleanName(name: string) {
  return name.trim().slice(0, 80);
}

export async function decideVideo(
  token: string,
  taskId: string,
  versionId: string,
  decision: "approved" | "changes",
  name: string,
  comment: string,
): Promise<PortalResult> {
  const ctx = await context(token, taskId);
  if (!ctx || !ctx.portal.show.review) return { ok: false, error: "Not available." };
  const approver = cleanName(name);
  if (!approver) return { ok: false, error: "Please enter your name." };
  if (decision === "changes" && !comment.trim()) return { ok: false, error: "Please describe what to change." };
  const latest = ctx.video.versions[0];
  if (!latest || latest.id !== versionId) return { ok: false, error: "There's a newer version of this video." };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("approvals")
    .insert({ task_id: taskId, kind: "video", version_id: versionId, status: decision, approver_name: approver, comment: comment.trim() || null })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  // Approved → ready to publish; changes → back to edit.
  await admin.from("tasks").update({ phase: decision === "approved" ? 4 : 2 }).eq("id", taskId);

  const title = ctx.video.title;
  const recipients = await teamOf(taskId);
  after(async () => {
    await admin.from("portal_activity").insert({
      client_id: ctx.portal.clientId,
      message: `${approver} ${decision === "approved" ? "approved" : "asked for changes to"} version ${latest.version} of “${title}”`,
    });
    await notify({
      event: decision === "approved" ? "client_approved" : "client_changes",
      taskId,
      recipientIds: recipients,
      extra: { by: approver, what: "video", comment: comment.trim() },
    });
  });
  revalidatePath(`/p/${token}`, "layout");
  return { ok: true, approvalId: data.id };
}

async function decideScriptInner(token: string, taskId: string, decision: "approved" | "changes", approver: string, comment: string) {
  const ctx = await context(token, taskId);
  if (!ctx || !ctx.portal.show.scripts) return { ok: false as const, error: "Not available." };
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("approvals")
    .insert({ task_id: taskId, kind: "script", status: decision, approver_name: approver, comment: comment.trim() || null })
    .select("id")
    .single();
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, approvalId: data.id, ctx };
}

export async function decideScript(token: string, taskId: string, decision: "approved" | "changes", name: string, comment: string): Promise<PortalResult> {
  const approver = cleanName(name);
  if (!approver) return { ok: false, error: "Please enter your name." };
  if (decision === "changes" && !comment.trim()) return { ok: false, error: "Please describe what to change." };
  const res = await decideScriptInner(token, taskId, decision, approver, comment);
  if (!res.ok) return res;
  const title = res.ctx.video.title;
  const recipients = await teamOf(taskId);
  after(async () => {
    await createAdminClient().from("portal_activity").insert({
      client_id: res.ctx.portal.clientId,
      message: `${approver} ${decision === "approved" ? "approved the script for" : "asked for script changes to"} “${title}”`,
    });
    await notify({ event: decision === "approved" ? "client_approved" : "client_changes", taskId, recipientIds: recipients, extra: { by: approver, what: "script", comment: comment.trim() } });
  });
  revalidatePath(`/p/${token}`, "layout");
  return { ok: true, approvalId: res.approvalId };
}

/** "Approve all remaining": every script on the shoot day that isn't approved and has no requested changes. */
export async function approveAllScripts(token: string, shootId: string, name: string): Promise<PortalResult> {
  const portal = await getPortal(token);
  if (!portal || !portal.show.scripts) return { ok: false, error: "Not available." };
  const approver = cleanName(name);
  if (!approver) return { ok: false, error: "Please enter your name." };
  const videos = (await getPortalVideos(portal.clientId, { shootId })).filter((v) => !v.scriptDecision);
  if (!videos.length) return { ok: true };
  const admin = createAdminClient();
  const { error } = await admin
    .from("approvals")
    .insert(videos.map((v) => ({ task_id: v.id, kind: "script", status: "approved", approver_name: approver })));
  if (error) return { ok: false, error: error.message };
  const recipients = [...new Set((await Promise.all(videos.map((v) => teamOf(v.id)))).flat())];
  after(async () => {
    await admin.from("portal_activity").insert({ client_id: portal.clientId, message: `${approver} approved ${videos.length} scripts` });
    await notify({
      event: "client_approved",
      taskId: videos[0].id,
      recipientIds: recipients,
      extra: { by: approver, what: "script", titles: videos.map((v) => v.title).join("\n") },
    });
  });
  revalidatePath(`/p/${token}`, "layout");
  return { ok: true };
}

/** Undo a decision made in the last 15 minutes (design: "Poništi"). */
export async function undoDecision(token: string, approvalId: string): Promise<PortalResult> {
  const portal = await getPortal(token);
  if (!portal) return { ok: false, error: "Not available." };
  const admin = createAdminClient();
  const { data: a } = await admin.from("approvals").select("id, task_id, kind, created_at, task:tasks(client_id)").eq("id", approvalId).maybeSingle<{
    id: string;
    task_id: string;
    kind: string;
    created_at: string;
    task: { client_id: string } | null;
  }>();
  if (!a || a.task?.client_id !== portal.clientId) return { ok: false, error: "Not found." };
  if (Date.now() - new Date(a.created_at).getTime() > UNDO_WINDOW_MS) return { ok: false, error: "Too late to undo." };
  await admin.from("approvals").delete().eq("id", a.id);
  if (a.kind === "video") await admin.from("tasks").update({ phase: 3 }).eq("id", a.task_id);
  revalidatePath(`/p/${token}`, "layout");
  return { ok: true };
}
