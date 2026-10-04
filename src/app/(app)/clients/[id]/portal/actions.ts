"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { parseLocale } from "@/lib/locale";
import { createClient } from "@/lib/supabase/server";

// RLS: only admins / managers of the client change portal settings.

const VIS = ["show_schedule", "show_shoots", "show_scripts", "show_review", "show_report"] as const;
export type PortalFlag = "enabled" | (typeof VIS)[number];

async function ensurePortal(clientId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("client_portals").select("client_id").eq("client_id", clientId).maybeSingle();
  if (!data) await supabase.from("client_portals").insert({ client_id: clientId });
  return supabase;
}

export async function setPortalFlag(clientId: string, flag: PortalFlag, value: boolean) {
  await requireProfile();
  if (flag !== "enabled" && !VIS.includes(flag)) return { error: "Unknown setting" };
  const supabase = await ensurePortal(clientId);
  const { error } = await supabase.from("client_portals").update({ [flag]: value }).eq("client_id", clientId);
  revalidatePath(`/clients/${clientId}/portal`);
  return { error: error?.message ?? null };
}

export async function setPortalLocale(clientId: string, value: string) {
  await requireProfile();
  const supabase = await ensurePortal(clientId);
  const { error } = await supabase.from("client_portals").update({ locale: parseLocale(value) }).eq("client_id", clientId);
  revalidatePath(`/clients/${clientId}/portal`);
  return { error: error?.message ?? null };
}

export async function rotateToken(clientId: string) {
  await requireProfile();
  const supabase = await ensurePortal(clientId);
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const { error } = await supabase
    .from("client_portals")
    .update({ token, rotated_at: new Date().toISOString() })
    .eq("client_id", clientId);
  revalidatePath(`/clients/${clientId}/portal`);
  return { error: error?.message ?? null };
}

export async function addPortalPerson(clientId: string, input: { label: string; email: string; can_approve: boolean }) {
  await requireProfile();
  const label = input.label.trim();
  if (!label) return { error: "Name or role is required." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("portal_people")
    .insert({ client_id: clientId, label, email: input.email.trim() || null, can_approve: input.can_approve });
  revalidatePath(`/clients/${clientId}/portal`);
  return { error: error?.message ?? null };
}

export async function updatePortalPerson(clientId: string, id: string, patch: { can_approve?: boolean; remove?: boolean }) {
  await requireProfile();
  const supabase = await createClient();
  const { error } = patch.remove
    ? await supabase.from("portal_people").delete().eq("id", id)
    : await supabase.from("portal_people").update({ can_approve: patch.can_approve }).eq("id", id);
  revalidatePath(`/clients/${clientId}/portal`);
  return { error: error?.message ?? null };
}
