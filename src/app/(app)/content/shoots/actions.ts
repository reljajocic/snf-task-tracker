"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// RLS: only admins / client managers create and edit shoot days.

export type ShootFormState = { error: string | null } | null;

const text = (v: FormDataEntryValue | null) => String(v ?? "").trim() || null;
const time = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return /^\d{2}:\d{2}$/.test(s) ? s : null;
};

export async function saveShoot(_prev: ShootFormState, form: FormData): Promise<ShootFormState> {
  await requireProfile();
  const id = text(form.get("id"));
  const date = text(form.get("date"));
  const fields = {
    client_id: text(form.get("client_id")),
    date,
    location: text(form.get("location")),
    starts_at: time(form.get("starts_at")),
    ends_at: time(form.get("ends_at")),
    notes: text(form.get("notes")),
  };
  if (!fields.client_id) return { error: "Pick a client." };
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Pick a date." };
  const crew = form.getAll("crew").map(String);

  const supabase = await createClient();
  let shootId = id;
  if (id) {
    const { data, error } = await supabase.from("shoot_days").update(fields).eq("id", id).select("id");
    if (error) return { error: error.message };
    if (!data?.length) return { error: "You can't edit this shoot day." };
  } else {
    const { data, error } = await supabase.from("shoot_days").insert(fields).select("id").single();
    if (error) return { error: error.message };
    shootId = data.id;
  }

  const { data: current } = await supabase.from("shoot_crew").select("user_id").eq("shoot_id", shootId);
  const have = new Set((current ?? []).map((r) => r.user_id));
  const add = crew.filter((u) => !have.has(u));
  const remove = [...have].filter((u) => !crew.includes(u));
  if (add.length) await supabase.from("shoot_crew").insert(add.map((user_id) => ({ shoot_id: shootId, user_id })));
  if (remove.length) await supabase.from("shoot_crew").delete().eq("shoot_id", shootId).in("user_id", remove);

  revalidatePath("/", "layout");
  redirect(`/content/shoots/${shootId}`);
}

export async function deleteShoot(id: string) {
  await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("shoot_days").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  redirect("/content/shoots");
}

/** Put videos on a shoot day at a time slot (moves them to the "shoot" phase). */
export async function addVideosToShoot(shootId: string, items: { id: string; time: string | null }[]) {
  await requireProfile();
  const supabase = await createClient();
  for (const [i, item] of items.entries()) {
    const { error } = await supabase
      .from("tasks")
      .update({ shoot_id: shootId, shoot_time: item.time && /^\d{2}:\d{2}$/.test(item.time) ? item.time : null, shoot_order: i })
      .eq("id", item.id);
    if (error) return { error: error.message };
  }
  revalidatePath("/", "layout");
  return { error: null };
}

export async function removeFromShoot(videoId: string) {
  await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update({ shoot_id: null, shoot_time: null, shot_status: "to_shoot" }).eq("id", videoId);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { error: null };
}
