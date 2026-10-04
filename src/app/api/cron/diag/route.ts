import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// TEMPORARY diagnostics for the sign-up link (remove after use). Protected by CRON_SECRET.
export async function GET(request: NextRequest) {
  // Only booleans and error messages go out (no data), and only for a well-formed token.
  const secret = process.env.CRON_SECRET;
  const cronOk = Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
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
    cronSecretSet: Boolean(secret),
    cronOk,
    plainFound: Boolean(plain.data),
    plainError: plain.error?.message ?? null,
    nestedFound: Boolean(nested.data),
    nestedError: nested.error?.message ?? null,
    portalLocales: (portals.data ?? []).map((p) => p.locale),
    portalsError: portals.error?.message ?? null,
  });
}
