import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { after } from "next/server";
import { formatDate } from "@/lib/dates";
import { notify } from "@/lib/notify";
import type { Database } from "@/lib/supabase/database.types";

// "Return to ideas" (reshoot), shared by the app and the MCP endpoint. The database function records
// the attempt and resets the video in one step, through RLS as the caller; here we add the reason check
// and tell the people on the video that the edit is off.

export type ReshootResult = { ok: true } | { ok: false; error: string };

const MESSAGES: [RegExp, string][] = [
  [/reason is required/i, "Say why it needs a reshoot."],
  [/already an idea/i, "This video is already an idea."],
  [/already published/i, "This video is already published."],
  [/dropped/i, "This video is dropped."],
  [/not found|not allowed|row-level security/i, "You can't change this video."],
];

export async function returnToIdeas(supabase: SupabaseClient<Database>, taskId: string, reason: string, actorId: string): Promise<ReshootResult> {
  const why = reason.trim().slice(0, 500);
  if (!why) return { ok: false, error: "Say why it needs a reshoot." };
  const { data: before } = await supabase
    .from("tasks")
    .select("publish_date, phase, task_assignees(user_id)")
    .eq("id", taskId)
    .maybeSingle<{ publish_date: string | null; phase: number | null; task_assignees: { user_id: string }[] }>();

  const { error } = await supabase.rpc("return_to_ideas", { tid: taskId, why });
  if (error) return { ok: false, error: MESSAGES.find(([re]) => re.test(error.message))?.[1] ?? error.message };

  // Only when there was edit work to cancel: a posting date, or footage already in the edit.
  const people = (before?.task_assignees ?? []).map((a) => a.user_id);
  if (before && people.length && (before.publish_date || (before.phase ?? 0) >= 2)) {
    const was = before.publish_date ? formatDate(before.publish_date) : "";
    after(() => notify({ event: "edit_cancelled", taskId, recipientIds: people, actorId, extra: { reason: why, publish: was } }));
  }
  return { ok: true };
}
