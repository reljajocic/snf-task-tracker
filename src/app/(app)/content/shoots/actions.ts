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
    drive_url: text(form.get("drive_url")),
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
      .update({ shoot_id: shootId, shoot_time: item.time && /^\d{2}:\d{2}$/.test(item.time) ? item.time : null, shoot_order: i, shot_status: "to_shoot" })
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

/** Call sheet: who comes at what time. */
export async function saveCallTimes(shootId: string, rows: { time: string; name: string; note: string }[]) {
  await requireProfile();
  const clean = rows
    .map((r) => ({ time: String(r.time ?? "").trim(), name: String(r.name ?? "").trim().slice(0, 80), note: String(r.note ?? "").trim().slice(0, 200) }))
    .filter((r) => /^\d{2}:\d{2}$/.test(r.time) && r.name)
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(0, 60);
  const supabase = await createClient();
  const { data, error } = await supabase.from("shoot_days").update({ call_times: clean }).eq("id", shootId).select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "You can't edit this shoot day." };
  revalidatePath(`/content/shoots/${shootId}`);
  return { error: null };
}

/**
 * Creates a shoot day with all its videos from the team's Google Sheet
 * (the sheet must be viewable by anyone with the link).
 */
export async function importShootSheet(_prev: ShootFormState, form: FormData): Promise<ShootFormState> {
  const me = await requireProfile();
  const clientId = text(form.get("client_id"));
  const link = text(form.get("url"));
  if (!clientId) return { error: "Pick a client." };
  const { csvExportUrl, parseShootSheet } = await import("@/lib/sheet-import");
  const url = link ? csvExportUrl(link) : null;
  if (!url) return { error: "Paste a Google Sheets link." };

  const res = await fetch(url, { redirect: "follow", cache: "no-store" });
  const type = res.headers.get("content-type") ?? "";
  if (!res.ok || !type.includes("text/csv")) {
    return { error: "Couldn't read the sheet. In Google Sheets: Share → General access → Anyone with the link (Viewer)." };
  }
  let parsed;
  try {
    parsed = parseShootSheet(await res.text());
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (!parsed.videos.length) return { error: "No videos found in that sheet." };

  const supabase = await createClient();
  const { data: shoot, error } = await supabase
    .from("shoot_days")
    .insert({ client_id: clientId, date: parsed.date ?? new Date().toISOString().slice(0, 10), call_times: parsed.callTimes, location: text(form.get("location")) })
    .select("id")
    .single();
  if (error) return { error: error.message };
  await supabase.from("shoot_crew").insert({ shoot_id: shoot.id, user_id: me.id });

  const { error: vErr } = await supabase.from("tasks").insert(
    parsed.videos.map((v) => ({
      kind: "video",
      title: v.title,
      client_id: clientId,
      on_camera: v.person || null,
      content_type: v.type || null,
      script: v.script,
      note: v.note || null,
      shoot_id: shoot.id,
      shoot_time: v.time,
      shoot_order: v.order,
      shot_status: v.status,
      phase: v.status === "shot" ? 2 : 1,
    })),
  );
  if (vErr) return { error: vErr.message };

  // New tags from the sheet join the client's list.
  const { data: client } = await supabase.from("clients").select("content_types").eq("id", clientId).single();
  const known: string[] = client?.content_types ?? [];
  const fresh = [...new Set(parsed.videos.map((v) => v.type).filter((x) => x && !known.includes(x)))];
  if (fresh.length) await supabase.from("clients").update({ content_types: [...known, ...fresh] }).eq("id", clientId);

  revalidatePath("/", "layout");
  redirect(`/content/shoots/${shoot.id}`);
}
