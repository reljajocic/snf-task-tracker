"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireProfile } from "@/lib/auth";
import { parseSocials } from "@/lib/socials";
import { createClient } from "@/lib/supabase/server";

// RLS enforces who may do what (admins create clients and staff them, managers edit their
// client and its projects). These actions shape the input and report errors.

export type FormState = { error: string | null } | null;

const CLIENT_STATUSES = ["active", "prospect", "paused", "finished"] as const;
const PROJECT_STATUSES = ["active", "on_hold", "completed", "archived"] as const;

const list = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
const text = (v: FormDataEntryValue | null) => String(v ?? "").trim() || null;
const date = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  if (/^\d{4}-\d{2}$/.test(s)) return `${s}-01`; // <input type="month">
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};
function oneOf<T extends readonly string[]>(v: FormDataEntryValue | null, options: T, fallback: T[number]): T[number] {
  const s = String(v ?? "");
  return (options as readonly string[]).includes(s) ? (s as T[number]) : fallback;
}

export async function saveClient(_prev: FormState, form: FormData): Promise<FormState> {
  await requireProfile();
  const id = text(form.get("id"));
  const fields = {
    name: text(form.get("name")),
    status: oneOf(form.get("status"), CLIENT_STATUSES, "active"),
    services: list(form.get("services")),
    city: text(form.get("city")),
    since: date(form.get("since")),
    email: text(form.get("email")),
    socials: (() => {
      try {
        return parseSocials(JSON.parse(String(form.get("socials") ?? "[]")));
      } catch {
        return [];
      }
    })(),
    locations: list(form.get("locations")),
    drive_url: text(form.get("drive_url")),
    notes: text(form.get("notes")),
    content_types: list(form.get("content_types")).map((x) => x.toUpperCase()),
    posting_days: form
      .getAll("posting_days")
      .map(Number)
      .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6),
  };
  if (!fields.name) return { error: "Name is required." };

  const supabase = await createClient();
  let clientId = id;
  if (id) {
    const { data, error } = await supabase.from("clients").update(fields).eq("id", id).select("id");
    if (error) return { error: error.message };
    if (!data?.length) return { error: "You can't edit this client." };
  } else {
    const { data, error } = await supabase.from("clients").insert(fields).select("id").single();
    if (error) return { error: error.message };
    clientId = data.id;
  }
  revalidatePath("/", "layout");
  redirect(`/clients/${clientId}`);
}

export async function deleteClient(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  redirect("/clients");
}

export async function setClientMember(clientId: string, userId: string, role: "manager" | "member" | null) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = role
    ? await supabase.from("client_members").upsert({ client_id: clientId, user_id: userId, role })
    : await supabase.from("client_members").delete().eq("client_id", clientId).eq("user_id", userId);
  if (error) return { error: error.message };
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/", "layout");
  return { error: null };
}

export async function saveProject(_prev: FormState, form: FormData): Promise<FormState> {
  await requireProfile();
  const id = text(form.get("id"));
  const clientId = text(form.get("client_id"));
  if (!clientId) return { error: "Missing client." };
  const fields = {
    client_id: clientId,
    name: text(form.get("name")),
    status: oneOf(form.get("status"), PROJECT_STATUSES, "active"),
    description: text(form.get("description")),
    starts_on: date(form.get("starts_on")),
    ends_on: date(form.get("ends_on")),
    drive_url: text(form.get("drive_url")),
  };
  if (!fields.name) return { error: "Name is required." };
  const members = form.getAll("members").map(String);

  const supabase = await createClient();
  let projectId = id;
  if (id) {
    const { data, error } = await supabase.from("projects").update(fields).eq("id", id).select("id");
    if (error) return { error: error.message };
    if (!data?.length) return { error: "You can't edit this project." };
  } else {
    const { data, error } = await supabase.from("projects").insert(fields).select("id").single();
    if (error) return { error: error.message };
    projectId = data.id;
  }

  // Sync project members.
  const { data: current } = await supabase.from("project_members").select("user_id").eq("project_id", projectId);
  const have = new Set((current ?? []).map((r) => r.user_id));
  const add = members.filter((u) => !have.has(u));
  const remove = [...have].filter((u) => !members.includes(u));
  if (add.length) {
    const { error } = await supabase.from("project_members").insert(add.map((user_id) => ({ project_id: projectId, user_id })));
    if (error) return { error: error.message };
  }
  if (remove.length) {
    const { error } = await supabase.from("project_members").delete().eq("project_id", projectId).in("user_id", remove);
    if (error) return { error: error.message };
  }
  revalidatePath("/", "layout");
  redirect(`/clients/${clientId}`);
}

export async function deleteProject(id: string, clientId: string) {
  await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  redirect(`/clients/${clientId}`);
}
