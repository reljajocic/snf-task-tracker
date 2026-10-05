import "server-only";
import { formatDate } from "@/lib/dates";
import { isEnabled, type NotificationEvent, type Preference } from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/server";

// Records notifications in the outbox table and delivers them by email (Resend).
// Runs with the service role *after* the user's own write succeeded, so it never widens access:
// recipients are always people who can already see the task (assignees / creator).

type TaskInfo = { id: string; title: string; due_date: string | null; client: { name: string } | null };

const FROM = process.env.NOTIFY_FROM ?? "Slate 'n' Frame <app@slatenframe.com>";

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

// Team emails carry the app's name; emails to clients carry the agency's.
export function emailHtml(heading: string, lines: string[], link: string, linkLabel: string, footer = "", brand = "SNF Dailies") {
  const body = lines.map((l) => `<p style="margin:0 0 10px;font:400 15px/1.55 Arial,sans-serif;color:#C9C7C1">${l}</p>`).join("");
  return `<!doctype html><html><body style="margin:0;background:#1C1A1B">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1C1A1B;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#2F2D2E;border-radius:8px;padding:32px">
<tr><td style="font:700 12px/1 Arial,sans-serif;letter-spacing:3px;text-transform:uppercase;color:#EA693A">${brand}</td></tr>
<tr><td style="padding:16px 0 14px;font:700 20px/1.3 Arial,sans-serif;color:#F4F3ED">${heading}</td></tr>
<tr><td>${body}</td></tr>
<tr><td style="padding-top:18px"><a href="${link}" style="display:inline-block;background:#EA693A;color:#2F2D2E;font:600 13px/1 Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:14px 22px;border-radius:4px">${linkLabel}</a></td></tr>
${footer ? `<tr><td style="padding-top:26px;font:400 12px/1.5 Arial,sans-serif;color:#8F898A">${footer}</td></tr>` : ""}
</table></td></tr></table></body></html>`;
}

export async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn(`[notify] RESEND_API_KEY not set; skipped email to ${to}: ${subject}`);
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  if (!res.ok) console.error("[notify] Resend error", res.status, await res.text());
  return res.ok;
}

type Message = { subject: string; heading: string; lines: string[] };

function describe(event: NotificationEvent, task: TaskInfo, actor: string | null, extra: Record<string, string>): Message {
  const title = escapeHtml(task.title);
  const where = task.client ? ` · ${escapeHtml(task.client.name)}` : "";
  const due = task.due_date ? `Deadline: ${formatDate(task.due_date)}` : "";
  const who = actor ? escapeHtml(actor) : "Someone";
  switch (event) {
    case "task_assigned":
      return { subject: `New task: ${task.title}`, heading: `${who} assigned you a task`, lines: [`<b style="color:#F4F3ED">${title}</b>${where}`, due].filter(Boolean) };
    case "task_commented":
      return { subject: `Comment on: ${task.title}`, heading: `${who} commented`, lines: [`<b style="color:#F4F3ED">${title}</b>${where}`, `“${escapeHtml(extra.body ?? "")}”`] };
    case "task_status_changed":
      return { subject: `${task.title}: ${extra.status}`, heading: `${who} moved a task to “${escapeHtml(extra.status ?? "")}”`, lines: [`<b style="color:#F4F3ED">${title}</b>${where}`] };
    case "task_due_tomorrow":
      return { subject: `Due tomorrow: ${task.title}`, heading: "Due tomorrow", lines: [`<b style="color:#F4F3ED">${title}</b>${where}`, due] };
    case "task_overdue":
      return { subject: `Overdue: ${task.title}`, heading: "This task is overdue", lines: [`<b style="color:#F4F3ED">${title}</b>${where}`, due] };
    case "client_approved":
      // "Approve all" on a shoot day: one email listing every script.
      if (extra.titles) {
        const titles = extra.titles.split("\n");
        return {
          subject: `Approved: ${titles.length} scripts${task.client ? ` · ${task.client.name}` : ""}`,
          heading: `${escapeHtml(extra.by ?? "The client")} approved ${titles.length} scripts`,
          lines: titles.map((x) => `• ${escapeHtml(x)}`),
        };
      }
      return {
        subject: `Approved: ${task.title}`,
        heading: `${escapeHtml(extra.by ?? "The client")} approved the ${extra.what ?? "video"}`,
        lines: [`<b style="color:#F4F3ED">${title}</b>${where}`],
      };
    case "client_changes":
      return {
        subject: `Changes requested: ${task.title}`,
        heading: `${escapeHtml(extra.by ?? "The client")} asked for changes to the ${extra.what ?? "video"}`,
        lines: [`<b style="color:#F4F3ED">${title}</b>${where}`, `“${escapeHtml(extra.comment ?? "")}”`],
      };
  }
}

/**
 * Notify `recipientIds` about `event` on a task (the actor is never notified about their own action).
 * Respects each recipient's preferences. Safe to call from `after()`; errors are logged, not thrown.
 */
export async function notify(opts: {
  event: NotificationEvent;
  taskId: string;
  recipientIds: string[];
  actorId?: string | null;
  extra?: Record<string, string>;
}) {
  try {
    const recipients = [...new Set(opts.recipientIds)].filter((id) => id !== opts.actorId);
    if (!recipients.length) return;
    const admin = createAdminClient();

    const [{ data: task }, { data: people }, { data: prefs }, actorRes] = await Promise.all([
      admin.from("tasks").select("id, title, due_date, client:clients(name)").eq("id", opts.taskId).single<TaskInfo>(),
      admin.from("profiles").select("id, email, is_active").in("id", recipients),
      admin.from("notification_preferences").select("user_id, event_type, channel, enabled").in("user_id", recipients),
      opts.actorId ? admin.from("profiles").select("full_name").eq("id", opts.actorId).single() : Promise.resolve({ data: null }),
    ]);
    if (!task) return;

    const msg = describe(opts.event, task, actorRes.data?.full_name ?? null, opts.extra ?? {});
    const link = `${siteUrl()}/?task=${task.id}`;

    for (const person of people ?? []) {
      if (!person.is_active) continue;
      const mine = (prefs ?? []).filter((p) => p.user_id === person.id) as Preference[];
      const { data: row } = await admin
        .from("notifications")
        .insert({ user_id: person.id, event_type: opts.event, task_id: task.id, actor_id: opts.actorId ?? null, payload: { ...opts.extra, subject: msg.subject } })
        .select("id")
        .single();
      if (!isEnabled(mine, opts.event, "email")) continue;
      const sent = await sendEmail(person.email, msg.subject, emailHtml(msg.heading, msg.lines, link, "Open task", "You can turn these emails off in Settings → Notifications."));
      if (sent && row) await admin.from("notifications").update({ delivered_at: new Date().toISOString() }).eq("id", row.id);
    }
  } catch (e) {
    console.error("[notify] failed", e);
  }
}

/**
 * Email the client's portal contacts who approve (only when a team member explicitly asks for it).
 * Returns how many emails were sent.
 */
export async function emailClient(opts: { clientId: string; subject: string; heading: string; lines: string[]; path: string }) {
  try {
    const admin = createAdminClient();
    const [{ data: portal }, { data: people }] = await Promise.all([
      admin.from("client_portals").select("token, enabled").eq("client_id", opts.clientId).maybeSingle(),
      admin.from("portal_people").select("email").eq("client_id", opts.clientId).eq("can_approve", true),
    ]);
    if (!portal?.enabled) return 0;
    const link = `${siteUrl()}/p/${portal.token}${opts.path}`;
    let sent = 0;
    for (const p of people ?? []) {
      if (!p.email) continue;
      if (await sendEmail(p.email, opts.subject, emailHtml(escapeHtml(opts.heading), opts.lines.map(escapeHtml), link, "Open", "", "Slate 'n' Frame"))) sent++;
    }
    return sent;
  } catch (e) {
    console.error("[notify] emailClient failed", e);
    return 0;
  }
}
