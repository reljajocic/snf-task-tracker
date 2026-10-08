import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/server";

// Personal AI keys (Settings → AI assistants). A key stands in for its owner: we look it up by hash,
// then work with a real Supabase session for that person, so every read and write goes through RLS
// exactly as if they were clicking in the app. The secret key is used only to find the key and sign in.

export const newApiToken = () => `snf_${randomBytes(24).toString("hex")}`;
export const hashApiToken = (token: string) => createHash("sha256").update(token).digest("hex");
const TOKEN_RE = /^snf_[0-9a-f]{48}$/;

type Session = { access: string; refresh: string; expiresAt: number };
// Per server instance; a cold start signs in again (one magic-link verification).
const sessions = new Map<string, Session>();

const anon = () =>
  createSupabaseClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

async function signIn(email: string): Promise<Session | null> {
  const admin = createAdminClient();
  const { data: link, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !link.properties?.hashed_token) return null;
  const { data } = await anon().auth.verifyOtp({ token_hash: link.properties.hashed_token, type: "magiclink" });
  const s = data.session;
  return s ? { access: s.access_token, refresh: s.refresh_token, expiresAt: s.expires_at ?? 0 } : null;
}

async function refresh(old: Session): Promise<Session | null> {
  const { data } = await anon().auth.refreshSession({ refresh_token: old.refresh });
  const s = data.session;
  return s ? { access: s.access_token, refresh: s.refresh_token, expiresAt: s.expires_at ?? 0 } : null;
}

export type McpCaller = { supabase: SupabaseClient<Database>; userId: string; name: string };

/** The person behind a key, with a client that acts as them, or null for an unknown/revoked key. */
export async function callerForToken(token: string): Promise<McpCaller | null> {
  if (!TOKEN_RE.test(token)) return null;
  const hash = hashApiToken(token);
  const admin = createAdminClient();
  // Checked on every call, so deleting the key in Settings cuts access right away.
  const { data: row } = await admin
    .from("api_tokens")
    .select("id, user_id, last_used_at, profile:profiles(email, full_name, is_active)")
    .eq("token_hash", hash)
    .maybeSingle<{ id: string; user_id: string; last_used_at: string | null; profile: { email: string; full_name: string; is_active: boolean } | null }>();
  if (!row?.profile?.is_active) return null;

  const now = Math.floor(Date.now() / 1000);
  let session = sessions.get(hash);
  if (session && session.expiresAt - 60 < now) session = (await refresh(session)) ?? undefined;
  if (!session) session = (await signIn(row.profile.email)) ?? undefined;
  if (!session) return null;
  sessions.set(hash, session);

  if (!row.last_used_at || Date.now() - new Date(row.last_used_at).getTime() > 5 * 60_000) {
    await admin.from("api_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", row.id);
  }
  const supabase = createSupabaseClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${session.access}` } },
  });
  return { supabase, userId: row.user_id, name: row.profile.full_name };
}
