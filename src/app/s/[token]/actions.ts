"use server";

import { revalidatePath } from "next/cache";
import { getSignup, joinNames, splitNames } from "@/lib/signup";
import { createAdminClient } from "@/lib/supabase/server";

// Sign-up from the talent link. No login: the token identifies the shoot, and every change is
// checked to be on a video of that shoot. Like the old shared sheet, anyone with the link can
// add or remove a name.

async function change(token: string, taskId: string, edit: (names: string[]) => string[]) {
  const signup = await getSignup(token);
  if (!signup || !signup.videos.some((v) => v.id === taskId)) return { ok: false as const, error: "Not available." };
  const admin = createAdminClient();
  const { data: task } = await admin.from("tasks").select("on_camera").eq("id", taskId).eq("shoot_id", signup.shootId).single();
  const names = edit(splitNames(task?.on_camera ?? null));
  const { error } = await admin.from("tasks").update({ on_camera: joinNames(names) }).eq("id", taskId).eq("shoot_id", signup.shootId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/s/${token}`);
  return { ok: true as const };
}

export async function addName(token: string, taskId: string, raw: string) {
  const name = raw.replace(/,/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  if (!name) return { ok: false as const, error: "name" };
  return change(token, taskId, (names) => (names.some((n) => n.toLowerCase() === name.toLowerCase()) ? names : [...names, name]));
}

export async function removeName(token: string, taskId: string, name: string) {
  return change(token, taskId, (names) => names.filter((n) => n !== name));
}
