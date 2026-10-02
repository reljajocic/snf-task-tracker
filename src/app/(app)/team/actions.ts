"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/auth";
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

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";

  const { error } = await createAdminClient().auth.admin.inviteUserByEmail(email, {
    data: {
      full_name: fullName,
      initials: initials || fullName.charAt(0).toUpperCase(),
      avatar_bg: color.bg,
      avatar_fg: color.fg,
      role,
    },
    redirectTo: `${proto}://${host}/auth/confirm`,
  });

  if (error) return { ok: false, message: error.message };
  revalidatePath("/team");
  return { ok: true, message: "", email };
}
