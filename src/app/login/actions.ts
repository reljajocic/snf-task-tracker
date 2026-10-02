"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginResult =
  | { ok: true }
  | { ok: false; error: "invalidEmail" | "notInvited" | "genericError" | "codeInvalid" };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function sendLoginLink(rawEmail: string): Promise<LoginResult> {
  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, error: "invalidEmail" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Invite-only: unknown addresses never get an account.
      shouldCreateUser: false,
      emailRedirectTo: `${await origin()}/auth/confirm`,
    },
  });

  if (!error) return { ok: true };
  if (error.code === "otp_disabled" || error.code === "signup_disabled") {
    return { ok: false, error: "notInvited" };
  }
  console.error("signInWithOtp failed", error.code, error.message);
  return { ok: false, error: "genericError" };
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
