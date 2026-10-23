import { NextResponse, type NextRequest } from "next/server";
import { connectWithCode, readState, syncClient } from "@/lib/instagram";
import { createAdminClient, createClient } from "@/lib/supabase/server";

// Instagram sends the team member back here after the login. The signed state says which client it was for
// (and that this person started it); the token is stored server-side only, then the first numbers are read.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  const clientId = userId ? readState(q.get("state") ?? "", userId) : null;
  if (!userId || !clientId) return NextResponse.redirect(new URL("/clients", request.url));
  const back = (status: string) => NextResponse.redirect(new URL(`/clients/${clientId}/portal?ig=${status}`, request.url));
  const { data: canManage } = await supabase.rpc("is_client_manager", { cid: clientId });
  if (!canManage) return back("denied");
  const code = q.get("code");
  if (!code) return back(q.get("error") === "access_denied" ? "cancelled" : "failed");

  try {
    const account = await connectWithCode(code);
    const admin = createAdminClient();
    const { error } = await admin.from("instagram_accounts").upsert({
      client_id: clientId,
      ig_user_id: account.igUserId,
      username: account.username,
      connected_by: userId,
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
