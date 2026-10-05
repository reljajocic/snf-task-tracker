"use server";

import { createClient } from "@/lib/supabase/server";
import { parseTheme, type Theme } from "@/lib/theme";

/** Remembers the theme (light / dark / follow the device) on the profile. */
export async function saveTheme(theme: Theme) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return;
  await supabase.from("profiles").update({ theme: parseTheme(theme) }).eq("id", userId);
}
