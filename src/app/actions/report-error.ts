"use server";

import { reportError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

/** Called by the error screens when something breaks in the browser. */
export async function reportBrowserError(message: string, digest: string | null, path: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  await reportError({ source: "browser", message, digest, path, userId: (data?.claims?.sub as string | undefined) ?? null });
}
