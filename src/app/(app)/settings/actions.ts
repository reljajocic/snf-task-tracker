"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, LOCALE_COOKIE_OPTIONS, parseLocale } from "@/lib/locale";
import { requireProfile } from "@/lib/auth";
import { NOTIFICATION_CHANNELS, NOTIFICATION_EVENTS, type NotificationChannel, type NotificationEvent } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";
import { inkOn, isHexColor } from "@/lib/color";
import { env } from "@/lib/env";
import { hashApiToken, newApiToken } from "@/lib/mcp/auth";
import { sendPush } from "@/lib/push";

export async function saveProfile(_prev: { ok: boolean; error?: string; at?: number } | null, form: FormData) {
  const me = await requireProfile();
  const fullName = String(form.get("full_name") ?? "").trim();
  const initials = String(form.get("initials") ?? "").trim().toUpperCase().slice(0, 2);
  const bg = form.get("avatar_bg");
  if (!fullName) return { ok: false, error: "Name is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      initials: initials || fullName.charAt(0).toUpperCase(),
      ...(isHexColor(bg) ? { avatar_bg: bg, avatar_fg: inkOn(bg) } : {}),
    })
    .eq("id", me.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  // `at` tells the form a new save happened (its "Saved" replays).
  return { ok: true, at: Date.now() };
}

export async function setLanguage(value: string) {
  const me = await requireProfile();
  const locale = parseLocale(value);
  const supabase = await createClient();
  await supabase.from("profiles").update({ locale }).eq("id", me.id);
  (await cookies()).set(LOCALE_COOKIE, locale, LOCALE_COOKIE_OPTIONS);
  revalidatePath("/", "layout");
}

export async function setPreference(event: NotificationEvent, channel: NotificationChannel, enabled: boolean) {
  const me = await requireProfile();
  if (!NOTIFICATION_EVENTS.includes(event) || !NOTIFICATION_CHANNELS.includes(channel)) return;
  const supabase = await createClient();
  await supabase
    .from("notification_preferences")
    .upsert({ user_id: me.id, event_type: event, channel, enabled });
  revalidatePath("/settings");
}

/** This device turns push notifications on (it then notifies me, whoever had it before). */
export async function savePushDevice(device: { endpoint?: string; keys?: { p256dh?: string; auth?: string } }) {
  await requireProfile();
  const { endpoint, keys } = device;
  if (!endpoint?.startsWith("https://") || !keys?.p256dh || !keys.auth) return { error: "Invalid device." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_push_subscription", { p_endpoint: endpoint, p_p256dh: keys.p256dh, p_auth: keys.auth });
  return error ? { error: error.message } : {};
}

export async function removePushDevice(endpoint: string) {
  await requireProfile();
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}

/** A test notification to my devices; says how many got it. */
export async function testPush() {
  await requireProfile();
  const supabase = await createClient();
  const { data } = await supabase.from("push_subscriptions").select("endpoint, p256dh, auth");
  const { sent } = await sendPush(data ?? [], { title: "SNF Dailies", body: "Notifications work on this device.", url: "/settings", tag: "test" });
  return sent;
}

/** A personal AI key (MCP). The key is returned once; only its hash is stored. RLS: your own keys. */
export async function createApiToken(name: string): Promise<{ url: string } | { error: string }> {
  await requireProfile();
  const label = name.trim().slice(0, 60) || "Claude";
  const token = newApiToken();
  const supabase = await createClient();
  const { error } = await supabase.from("api_tokens").insert({ name: label, token_hash: hashApiToken(token) });
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { url: `${env.siteUrl}/api/mcp/${token}` };
}

export async function deleteApiToken(id: string) {
  await requireProfile();
  const supabase = await createClient();
  await supabase.from("api_tokens").delete().eq("id", id);
  revalidatePath("/settings");
}
