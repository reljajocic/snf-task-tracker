import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/server";

// Instagram API with Instagram login. Each client's professional account is connected once (the team logs in
// as the client); the long-lived token (60 days) is kept server-side and refreshed before it runs out.
// Each morning (and on "Refresh") we read the followers and the numbers of every post the team linked
// to a video ("Link to the post"). Unversioned Graph calls go to the app's own version.

const AUTH_URL = "https://www.instagram.com/oauth/authorize";
const TOKEN_URL = "https://api.instagram.com/oauth/access_token";
const GRAPH = "https://graph.instagram.com";
export const INSTAGRAM_SCOPES = ["instagram_business_basic", "instagram_business_manage_insights"];
const METRICS = ["views", "reach", "likes", "comments", "saved", "shares"] as const;
type Metric = (typeof METRICS)[number];

const appId = () => process.env.INSTAGRAM_APP_ID ?? "";
const appSecret = () => process.env.INSTAGRAM_APP_SECRET ?? "";
export const instagramConfigured = () => Boolean(appId() && appSecret());
export const redirectUri = () => `${env.siteUrl}/api/instagram/callback`;

// ---------------------------------------------------------------- the login round trip
// The state carries which client and who started it (a team member's id, or "portal" when the client connects
// from their portal), signed, so the callback can't be replayed for another client, and expires after 15 minutes.
const sign = (payload: string) => createHmac("sha256", appSecret()).update(payload).digest("base64url");

export const PORTAL = "portal";

export function makeState(clientId: string, by: string) {
  const payload = Buffer.from(JSON.stringify({ c: clientId, u: by, t: Date.now() })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readState(state: string): { clientId: string; by: string } | null {
  const [payload, mac] = state.split(".");
  if (!payload || !mac) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const { c, u, t } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { c: string; u: string; t: number };
    return Date.now() - t < 15 * 60_000 ? { clientId: c, by: u } : null;
  } catch {
    return null;
  }
}

export function authorizeUrl(state: string) {
  const q = new URLSearchParams({ client_id: appId(), redirect_uri: redirectUri(), response_type: "code", scope: INSTAGRAM_SCOPES.join(","), state, enable_fb_login: "0", force_reauth: "true" });
  return `${AUTH_URL}?${q}`;
}

async function json<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } | string; error_message?: string };
  if (!res.ok) {
    const e = body.error;
    throw new Error((typeof e === "string" ? e : e?.message) ?? body.error_message ?? `Instagram ${res.status}`);
  }
  return body;
}

/** Code from the login → a long-lived token and the account it belongs to. */
export async function connectWithCode(code: string) {
  const form = new URLSearchParams({ client_id: appId(), client_secret: appSecret(), grant_type: "authorization_code", redirect_uri: redirectUri(), code });
  const short = await json<{ access_token: string }>(await fetch(TOKEN_URL, { method: "POST", body: form }));
  const long = await json<{ access_token: string; expires_in: number }>(
    await fetch(`${GRAPH}/access_token?${new URLSearchParams({ grant_type: "ig_exchange_token", client_secret: appSecret(), access_token: short.access_token })}`),
  );
  const me = await json<{ user_id: string; username: string }>(await fetch(`${GRAPH}/me?${new URLSearchParams({ fields: "user_id,username", access_token: long.access_token })}`));
  return { token: long.access_token, expiresAt: new Date(Date.now() + long.expires_in * 1000).toISOString(), igUserId: String(me.user_id), username: me.username };
}

// ---------------------------------------------------------------- reading the numbers
/** "instagram.com/p/ABC/", "/reel/ABC", "/reels/ABC/?igsh=…" → "ABC" (how a post link and a media item meet). */
export function shortcode(url: string | null | undefined): string | null {
  return url?.match(/instagram\.com\/(?:[^/]+\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i)?.[1] ?? null;
}

type Media = { id: string; permalink?: string; like_count?: number; comments_count?: number };

async function insights(mediaId: string, token: string): Promise<Partial<Record<Metric, number>>> {
  const read = async (metrics: readonly Metric[]) => {
    const r = await json<{ data: { name: Metric; values?: { value: number }[]; total_value?: { value: number } }[] }>(
      await fetch(`${GRAPH}/${mediaId}/insights?${new URLSearchParams({ metric: metrics.join(","), access_token: token })}`),
    );
    return Object.fromEntries(r.data.map((m) => [m.name, m.total_value?.value ?? m.values?.[0]?.value ?? 0])) as Partial<Record<Metric, number>>;
  };
  try {
    return await read(METRICS);
  } catch {
    // Not every metric exists for every kind of post (a photo has no views on some versions): ask one by one.
    const out: Partial<Record<Metric, number>> = {};
    for (const m of METRICS) Object.assign(out, await read([m]).catch(() => ({})));
    return out;
  }
}

/** Refreshes one client's token if it's getting old, records followers, and the numbers of its linked posts. */
export async function syncClient(clientId: string): Promise<{ posts: number }> {
  const admin = createAdminClient();
  const { data: tok } = await admin.from("instagram_tokens").select("access_token, expires_at").eq("client_id", clientId).maybeSingle();
  if (!tok) return { posts: 0 };
  let token = tok.access_token;
  try {
    // Long-lived tokens last 60 days and can be refreshed once they're a day old: do it in the last 3 weeks.
    if (!tok.expires_at || Date.parse(tok.expires_at) - Date.now() < 21 * 86_400_000) {
      const r = await json<{ access_token: string; expires_in: number }>(
        await fetch(`${GRAPH}/refresh_access_token?${new URLSearchParams({ grant_type: "ig_refresh_token", access_token: token })}`),
      );
      token = r.access_token;
      await admin.from("instagram_tokens").update({ access_token: token, expires_at: new Date(Date.now() + r.expires_in * 1000).toISOString() }).eq("client_id", clientId);
    }

    const me = await json<{ followers_count?: number }>(await fetch(`${GRAPH}/me?${new URLSearchParams({ fields: "followers_count", access_token: token })}`));
    if (typeof me.followers_count === "number") {
      const day = new Date().toISOString().slice(0, 10);
      await admin.from("instagram_followers").upsert({ client_id: clientId, day, followers: me.followers_count });
    }

    // The client's videos with a post link, and the account's recent posts (a few pages back).
    const { data: videos } = await admin.from("tasks").select("id, post_url").eq("client_id", clientId).not("post_url", "is", null);
    const wanted = new Map((videos ?? []).map((v) => [shortcode(v.post_url), v.id]).filter((x): x is [string, string] => !!x[0]));
    let posts = 0;
    if (wanted.size) {
      let next: string | null = `${GRAPH}/me/media?${new URLSearchParams({ fields: "id,permalink,like_count,comments_count", limit: "100", access_token: token })}`;
      for (let page = 0; next && page < 5 && wanted.size; page++) {
        const r: { data: Media[]; paging?: { next?: string } } = await json(await fetch(next));
        for (const m of r.data) {
          const taskId = wanted.get(shortcode(m.permalink) ?? "");
          if (!taskId) continue;
          wanted.delete(shortcode(m.permalink)!);
          const n = await insights(m.id, token);
          await admin.from("post_metrics").upsert({
            task_id: taskId,
            media_id: m.id,
            views: n.views ?? null,
            reach: n.reach ?? null,
            likes: n.likes ?? m.like_count ?? null,
            comments: n.comments ?? m.comments_count ?? null,
            saved: n.saved ?? null,
            shares: n.shares ?? null,
            fetched_at: new Date().toISOString(),
          });
          posts++;
        }
        next = r.paging?.next ?? null;
      }
    }
    await admin.from("instagram_accounts").update({ synced_at: new Date().toISOString(), sync_error: null }).eq("client_id", clientId);
    return { posts };
  } catch (e) {
    await admin.from("instagram_accounts").update({ sync_error: e instanceof Error ? e.message.slice(0, 300) : "Sync failed" }).eq("client_id", clientId);
    throw e;
  }
}

/** Every connected client (the morning cron). One failing doesn't stop the others. */
export async function syncAll() {
  const { data } = await createAdminClient().from("instagram_accounts").select("client_id");
  let ok = 0;
  for (const a of data ?? []) {
    try {
      await syncClient(a.client_id);
      ok++;
    } catch {
      /* recorded on the account as sync_error */
    }
  }
  return ok;
}
