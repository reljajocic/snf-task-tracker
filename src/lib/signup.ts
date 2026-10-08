import "server-only";
import { parseLocale, type Locale } from "@/lib/locale";
import { createAdminClient } from "@/lib/supabase/server";
import type { ScriptSection } from "@/lib/tasks";

// The talent sign-up page (/s/<token>): one shoot day, its videos and scripts, who's signed up.
// Loaded with the service role and always scoped to the shoot the token belongs to.

export type SignupVideo = {
  id: string;
  title: string;
  type: string | null;
  names: string[];
  script: ScriptSection[];
  time: string | null;
  status: "to_shoot" | "shot" | "not_shot";
};
export type Signup = {
  shootId: string;
  clientName: string;
  date: string;
  location: string | null;
  locale: Locale;
  videos: SignupVideo[];
};

/** "Ana, Marko" ⇄ ["Ana", "Marko"]: names live in tasks.on_camera, comma-separated. */
export const splitNames = (s: string | null) => (s ?? "").split(",").map((x) => x.trim()).filter(Boolean);
export const joinNames = (names: string[]) => names.join(", ") || null;

export async function getSignup(token: string): Promise<Signup | null> {
  if (!/^[0-9a-f]{32}$/.test(token)) return null;
  const admin = createAdminClient();
  const { data: shoot } = await admin
    .from("shoot_days")
    .select("id, date, location, client_id, client:clients(name, client_portals(locale))")
    .eq("signup_token", token)
    .maybeSingle<{ id: string; date: string; location: string | null; client_id: string; client: { name: string; client_portals: { locale: string }[] | { locale: string } | null } | null }>();
  if (!shoot) return null;
  const { data: videos } = await admin
    .from("tasks")
    .select("id, title, content_type, on_camera, script, shoot_time, shot_status, shoot_order, created_at")
    .eq("shoot_id", shoot.id)
    .is("dropped_at", null)
    .order("shoot_order", { nullsFirst: false })
    .order("created_at");
  const portals = shoot.client?.client_portals;
  const portalLocale = Array.isArray(portals) ? portals[0]?.locale : portals?.locale;
  return {
    shootId: shoot.id,
    clientName: shoot.client?.name ?? "",
    date: shoot.date,
    location: shoot.location,
    locale: parseLocale(portalLocale ?? "sr"),
    videos: (videos ?? []).map((v) => ({
      id: v.id,
      title: v.title,
      type: v.content_type,
      names: splitNames(v.on_camera),
      script: (Array.isArray(v.script) ? (v.script as ScriptSection[]) : []).filter((s) => s.text?.trim()),
      time: v.shoot_time,
      status: v.shot_status === "shot" || v.shot_status === "not_shot" ? v.shot_status : "to_shoot",
    })),
  };
}
