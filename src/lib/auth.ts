import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  initials: string;
  avatar_bg: string;
  avatar_fg: string;
  avatar_url?: string | null;
  role: "admin" | "user";
  theme: "dark" | "light";
  is_active: boolean;
};

/** Signed-in user's id from the session JWT (verified locally, no network round trip). */
export const requireUserId = cache(async (): Promise<string> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");
  return userId;
});

/** The signed-in team member, once per request. Redirects to /login when there is none. */
export const requireProfile = cache(async (): Promise<Profile> => {
  const userId = await requireUserId();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, initials, avatar_bg, avatar_fg, avatar_url, role, theme, is_active")
    .eq("id", userId)
    .single<Profile>();

  if (!profile || !profile.is_active) redirect("/auth/signout?reason=inactive");
  return profile;
});

export async function requireAdmin(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== "admin") redirect("/");
  return profile;
}
