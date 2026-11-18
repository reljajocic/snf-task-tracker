"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// RLS: the client's team writes docs; the database stamps who changed them and when.

/** A new page, placed last. Returns its id so the page can open it for editing. */
export async function createClientDoc(clientId: string, title: string, body = "") {
  await requireProfile();
  const supabase = await createClient();
  const { data: last } = await supabase.from("client_docs").select("position").eq("client_id", clientId).order("position", { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await supabase
    .from("client_docs")
    .insert({ client_id: clientId, title: title.trim().slice(0, 120) || "Untitled", body: body.slice(0, 50000), position: (last?.position ?? -1) + 1 })
    .select("id")
    .single();
  if (error) return { error: error.message, id: null };
  revalidatePath(`/clients/${clientId}/docs`);
  return { error: null, id: data.id };
}

export async function saveClientDoc(clientId: string, id: string, input: { title: string; body: string }) {
  await requireProfile();
  const title = input.title.trim();
  if (!title) return { error: "Give the page a title." };
  if (input.body.length > 50000) return { error: "This page is too long. Split it into two." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("client_docs").update({ title: title.slice(0, 120), body: input.body }).eq("id", id).select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Only this client's team can edit its docs." };
  revalidatePath(`/clients/${clientId}/docs`);
  return { error: null };
}

export async function deleteClientDoc(clientId: string, id: string) {
  await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("client_docs").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/clients/${clientId}/docs`);
  return { error: null };
}
