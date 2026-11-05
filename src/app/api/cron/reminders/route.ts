import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { addDays, today } from "@/lib/dates";
import { instagramConfigured, syncAll } from "@/lib/instagram";
import { notify, notifyReminder } from "@/lib/notify";
import { nextMonthly } from "@/lib/reminders";
import { createAdminClient } from "@/lib/supabase/server";

// Daily reminders, called once each morning by .github/workflows/reminders.yml:
//   - deadline reminders for open tasks: 3, 2 and 1 day before, and on the day
//   - "overdue" once, on the first day a task is late (no daily nagging)
//   - reminders people set on a client ("send the invoice"), on their day (or the first run after it)
// Protected by CRON_SECRET (Authorization: Bearer <secret>).
/** Days before the deadline that get a reminder (0 = on the day). */
const REMIND_DAYS = [3, 2, 1, 0];

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret ?? ""}`);
  // Constant-time compare, so the secret can't be guessed byte by byte from response times.
  if (!secret || given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = today();
  const admin = createAdminClient();
  const { data: tasks, error } = await admin
    .from("tasks")
    .select("id, kind, due_date, editor_id, task_assignees(user_id)")
    .in("due_date", [...REMIND_DAYS.map((d) => addDays(now, d)), addDays(now, -1)])
    .not("status", "in", "(done,waiting_client)");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sent = 0;
  for (const task of tasks ?? []) {
    // A video's deadline is its editor's; other tasks remind everyone on them.
    const recipients = task.kind === "video" ? (task.editor_id ? [task.editor_id] : []) : (task.task_assignees as { user_id: string }[]).map((a) => a.user_id);
    if (!recipients.length) continue;
    const days = REMIND_DAYS.find((d) => task.due_date === addDays(now, d));
    await notify({
      event: days === undefined ? "task_overdue" : "task_due_tomorrow",
      taskId: task.id,
      recipientIds: recipients,
      extra: days === undefined ? {} : { days: String(days) },
    });
    sent++;
  }
  // Client reminders: a monthly one moves to next month, a one-off is done.
  const { data: reminders } = await admin
    .from("client_reminders")
    .select("id, user_id, client_id, title, remind_on, repeat, client:clients(name)")
    .is("done_at", null)
    .lte("remind_on", now);
  let reminded = 0;
  for (const r of reminders ?? []) {
    const client = r.client as unknown as { name: string } | null; // many-to-one: one client
    await notifyReminder({ reminderId: r.id, userId: r.user_id, clientId: r.client_id, clientName: client?.name ?? "", title: r.title });
    await admin
      .from("client_reminders")
      .update(r.repeat === "monthly" ? { remind_on: nextMonthly(r.remind_on, now) } : { done_at: new Date().toISOString() })
      .eq("id", r.id);
    reminded++;
  }
  // Subscriptions due today (or missed on a day the cron didn't run) become costs.
  const { data: posted } = await admin.rpc("post_subscriptions", {});
  // Instagram numbers for every connected client (followers, and the posts linked to videos).
  const instagram = instagramConfigured() ? await syncAll() : 0;
  return NextResponse.json({ ok: true, tasks: sent, reminders: reminded, subscriptionCosts: posted ?? 0, instagramClients: instagram });
}
