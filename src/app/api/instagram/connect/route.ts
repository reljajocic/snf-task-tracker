import { NextResponse, type NextRequest } from "next/server";
import { authorizeUrl, instagramConfigured, makeState, PORTAL } from "@/lib/instagram";
import { getPortal } from "@/lib/portal";
import { createAdminClient, createClient } from "@/lib/supabase/server";

// "Connect Instagram": sends to Instagram's login, as the client.
//   ?client=<id>   whoever runs the client, from the app (signed in)
//   ?portal=<token> the client themselves, from their portal (only while nothing is connected yet;
//                  changing or removing it stays with the team)
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const portalToken = q.get("portal");
  if (portalToken) {
    const portal = await getPortal(portalToken);
    if (!portal) return NextResponse.redirect(new URL("/", request.url));
    const back = (status: string) => NextResponse.redirect(new URL(`/p/${portalToken}/reports?ig=${status}`, request.url));
    if (!instagramConfigured()) return back("config");
    const { data: existing } = await createAdminClient().from("instagram_accounts").select("client_id").eq("client_id", portal.clientId).maybeSingle();
    if (existing) return back("connected");
    return NextResponse.redirect(authorizeUrl(makeState(portal.clientId, PORTAL)));
  }

  const clientId = q.get("client") ?? "";
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  const { data: canManage } = userId ? await supabase.rpc("is_client_manager", { cid: clientId }) : { data: false };
  if (!userId || !canManage) return NextResponse.redirect(new URL(userId ? `/clients/${clientId}` : "/login", request.url));
  if (!instagramConfigured()) return NextResponse.redirect(new URL(`/clients/${clientId}/portal?ig=config`, request.url));
  return NextResponse.redirect(authorizeUrl(makeState(clientId, userId)));
}
