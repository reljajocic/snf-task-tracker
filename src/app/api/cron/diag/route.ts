import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// TEMPORARY diagnostics for the sign-up link (remove after use). Protected by CRON_SECRET.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const admin = createAdminClient();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const plain = await admin.from("shoot_days").select("id, signup_token").eq("signup_token", token).maybeSingle();
  const nested = await admin
    .from("shoot_days")
    .select("id, client:clients(name, client_portals(locale))")
    .eq("signup_token", token)
    .maybeSingle();
  const portals = await admin.from("client_portals").select("client_id, locale").limit(3);
  return NextResponse.json({
    project: url.replace(/^https:\/\/([^.]+).*/, "$1"),
    keyKind: (process.env.SUPABASE_SECRET_KEY ?? "").split("_").slice(0, 2).join("_"),
    plain: { data: plain.data, error: plain.error?.message },
    nested: { data: nested.data, error: nested.error?.message },
    portals: { data: portals.data, error: portals.error?.message },
  });
}
