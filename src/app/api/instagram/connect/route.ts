import { NextResponse, type NextRequest } from "next/server";
import { authorizeUrl, instagramConfigured, makeState } from "@/lib/instagram";
import { createClient } from "@/lib/supabase/server";

// "Connect Instagram" on a client: sends whoever runs the client to Instagram's login, as that client.
export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get("client") ?? "";
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  const { data: canManage } = await supabase.rpc("is_client_manager", { cid: clientId });
  if (!userId || !canManage) return NextResponse.redirect(new URL(`/clients/${clientId}`, request.url));
  if (!instagramConfigured()) return NextResponse.redirect(new URL(`/clients/${clientId}/portal?ig=config`, request.url));
  return NextResponse.redirect(authorizeUrl(makeState(clientId, userId)));
}
