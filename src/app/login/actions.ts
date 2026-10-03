"use server";

import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export type LoginResult =
  | { ok: true }
  | { ok: false; error: "invalidEmail" | "notInvited" | "genericError" | "codeInvalid" };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


export async function sendLoginLink(rawEmail: string): Promise<LoginResult> {
  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, error: "invalidEmail" };

  const supabase = await createClient();
  const send = () =>
    supabase.auth.signInWithOtp({
      email,
      options: {
        // Invite-only: unknown addresses never get an account.
        shouldCreateUser: false,
        emailRedirectTo: `${env.siteUrl}/auth/confirm`,
      },
    });

  let { error } = await send();
  if (error && (error.code === "otp_disabled" || error.code === "signup_disabled") && (await confirmInvitee(email))) {
    ({ error } = await send());
  }
  if (!error) return { ok: true };
  if (error.code === "otp_disabled" || error.code === "signup_disabled") {
    return { ok: false, error: "notInvited" };
  }
  console.error("signInWithOtp failed", error.code, error.message);
  return { ok: false, error: "genericError" };
}

/**
 * Someone invited who never opened the invite email is still "unconfirmed", and Supabase
 * refuses to send them a sign-in code. Being on the team (an active profile, created only by
 * an admin's invite) is what counts, so confirm them and let the normal sign-in go through.
 */
async function confirmInvitee(email: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("id").eq("email", email).eq("is_active", true).maybeSingle();
  if (!profile) return false;
  const { error } = await admin.auth.admin.updateUserById(profile.id, { email_confirm: true });
  return !error;
}

export async function verifyLoginCode(rawEmail: string, rawCode: string): Promise<LoginResult> {
  const email = rawEmail.trim().toLowerCase();
  const token = rawCode.replace(/\D/g, "");
  if (token.length < 6) return { ok: false, error: "codeInvalid" };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) return { ok: false, error: "codeInvalid" };
  redirect("/");
}
