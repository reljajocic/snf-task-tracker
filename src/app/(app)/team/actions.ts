"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/server";
import { AVATAR_COLORS } from "@/lib/team";

export type InviteState = { ok: boolean; message: string; email?: string } | null;

export async function inviteMember(_prev: InviteState, form: FormData): Promise<InviteState> {
  await requireAdmin();

  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const fullName = String(form.get("full_name") ?? "").trim();
  const initials = String(form.get("initials") ?? "").trim().toUpperCase().slice(0, 2);
  const color = AVATAR_COLORS[Number(form.get("color") ?? 0)] ?? AVATAR_COLORS[0];
  const role = form.get("role") === "admin" ? "admin" : "user";
  if (!email || !fullName) return { ok: false, message: "Name and email are required." };

  const { error } = await createAdminClient().auth.admin.inviteUserByEmail(email, {
    data: {
      full_name: fullName,
      initials: initials || fullName.charAt(0).toUpperCase(),
      avatar_bg: color.bg,
      avatar_fg: color.fg,
      role,
    },
    redirectTo: `${env.siteUrl}/auth/confirm`,
  });

  if (error) return { ok: false, message: error.message };
  revalidatePath("/team");
  return { ok: true, message: "", email };
}

export async function updateMember(userId: string, patch: { role?: "admin" | "user"; is_active?: boolean }) {
  const me = await requireAdmin();
  if (userId === me.id) return { error: "You can't change your own role or access." };
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) return { error: error.message };
  if (patch.is_active !== undefined) {
    // Block (or unblock) sign-in and token refresh, so an existing session can't keep using the API.
    const { error: banError } = await createAdminClient().auth.admin.updateUserById(userId, {
      ban_duration: patch.is_active ? "none" : "876000h",
    });
    if (banError) return { error: banError.message };
  }
  revalidatePath("/team");
  return { error: null };
}
