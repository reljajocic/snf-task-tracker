import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { LOCALE_COOKIE, LOCALE_COOKIE_OPTIONS, parseLocale } from "@/lib/locale";

/** After signing in: pick up the language saved on the profile (so it follows the user to new devices). */
export async function syncLocaleCookie() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) return;
  const { data: profile } = await supabase.from("profiles").select("locale").eq("id", id).maybeSingle();
  (await cookies()).set(LOCALE_COOKIE, parseLocale(profile?.locale), LOCALE_COOKIE_OPTIONS);
}
