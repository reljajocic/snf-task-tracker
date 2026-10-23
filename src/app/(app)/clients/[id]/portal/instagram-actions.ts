"use server";

import { revalidatePath } from "next/cache";
import { syncClient } from "@/lib/instagram";
import { createAdminClient, createClient } from "@/lib/supabase/server";

// Only whoever runs the client (its managers, the admin) refreshes or disconnects its Instagram.
async function allowed(clientId: string) {
  const { data } = await (await createClient()).rpc("is_client_manager", { cid: clientId });
  return !!data;
}

export async function syncInstagramNow(clientId: string): Promise<{ error: string | null; posts?: number }> {
  if (!(await allowed(clientId))) return { error: "Not allowed." };
  try {
    const { posts } = await syncClient(clientId);
    revalidatePath(`/clients/${clientId}`, "layout");
    return { error: null, posts };
  } catch (e) {
    revalidatePath(`/clients/${clientId}/portal`);
    return { error: e instanceof Error ? e.message : "Sync failed" };
  }
}

/** Forgets the account and its token (numbers already read stay in the reports). */
export async function disconnectInstagram(clientId: string): Promise<{ error: string | null }> {
  if (!(await allowed(clientId))) return { error: "Not allowed." };
  const { error } = await createAdminClient().from("instagram_accounts").delete().eq("client_id", clientId);
  revalidatePath(`/clients/${clientId}/portal`);
  return { error: error?.message ?? null };
}
