import { NextResponse, type NextRequest } from "next/server";
import { connectWithCode, PORTAL, readState, syncClient } from "@/lib/instagram";
import { createAdminClient, createClient } from "@/lib/supabase/server";

// Instagram sends whoever logged in back here. The signed state says which client it was for and who started it:
// a team member (must still be signed in as them and run the client) or the client from their portal (only
// while nothing is connected). The token is stored server-side only, then the first numbers are read.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const state = readState(q.get("state") ?? "");
  if (!state) return NextResponse.redirect(new URL("/", request.url));
  const { clientId, by } = state;
  const admin = createAdminClient();

  let back: (status: string) => NextResponse;
  let connectedBy: string | null = null;
  if (by === PORTAL) {
    const { data: portal } = await admin.from("client_portals").select("token, enabled").eq("client_id", clientId).maybeSingle();
    if (!portal?.enabled) return NextResponse.redirect(new URL("/", request.url));
    back = (status) => NextResponse.redirect(new URL(`/p/${portal.token}/reports?ig=${status}`, request.url));
    const { data: existing } = await admin.from("instagram_accounts").select("client_id").eq("client_id", clientId).maybeSingle();
    if (existing) return back("connected");
  } else {
    back = (status) => NextResponse.redirect(new URL(`/clients/${clientId}/portal?ig=${status}`, request.url));
    const supabase = await createClient();
    const { data: claims } = await supabase.auth.getClaims();
    if (claims?.claims?.sub !== by) return NextResponse.redirect(new URL("/login", request.url));
    const { data: canManage } = await supabase.rpc("is_client_manager", { cid: clientId });
    if (!canManage) return back("denied");
    connectedBy = by;
  }

  const code = q.get("code");
  if (!code) return back(q.get("error") === "access_denied" ? "cancelled" : "failed");
  try {
    const account = await connectWithCode(code);
    const { error } = await admin.from("instagram_accounts").upsert({
      client_id: clientId,
      ig_user_id: account.igUserId,
      username: account.username,
      connected_by: connectedBy,
      connected_at: new Date().toISOString(),
      sync_error: null,
    });
    if (error) throw error;
    await admin.from("instagram_tokens").upsert({ client_id: clientId, access_token: account.token, expires_at: account.expiresAt });
    await syncClient(clientId).catch(() => undefined);
    return back("connected");
  } catch (e) {
    console.error("[instagram] connect failed", e);
    return back("failed");
  }
}
