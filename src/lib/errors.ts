import "server-only";
import { emailHtml, sendEmail } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase/server";

// Error reporting without a third-party service: every error is kept in app_errors, and the
// admin gets an email the first time a given error shows up in an hour (no inbox floods).

export type ErrorReport = {
  source: "server" | "browser";
  message: string;
  digest?: string | null;
  path?: string | null;
  route?: string | null;
  userId?: string | null;
};

const clip = (s: string | null | undefined, n: number) => (s ? String(s).slice(0, n) : null);

export async function reportError(report: ErrorReport) {
  try {
    const admin = createAdminClient();
    const message = clip(report.message, 2000) ?? "Unknown error";
    const since = new Date(Date.now() - 60 * 60_000).toISOString();
    const { count } = await admin
      .from("app_errors")
      .select("id", { count: "exact", head: true })
      .eq("message", message)
      .gte("created_at", since);
    await admin.from("app_errors").insert({
      source: report.source,
      message,
      digest: clip(report.digest, 200),
      path: clip(report.path, 500),
      route: clip(report.route, 300),
      user_id: report.userId ?? null,
    });
    if (count) return;

    const { data: admins } = await admin.from("profiles").select("email").eq("role", "admin").eq("is_active", true);
    const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
    const lines = [
      `<b style="color:#F4F3ED">${escape(message)}</b>`,
      `Where: ${escape(report.source)} · ${escape(report.path ?? report.route ?? "—")}`,
      report.digest ? `Digest: ${escape(report.digest)}` : "",
      "More of the same in the next hour won't be emailed.",
    ].filter(Boolean);
    for (const a of admins ?? []) {
      await sendEmail(a.email, `SNF Dailies error: ${message.slice(0, 80)}`, emailHtml("Someone hit an error", lines, `${site}${report.path ?? "/"}`, "Open the page"));
    }
  } catch (e) {
    console.error("[errors] could not report", e);
  }
}

function escape(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
