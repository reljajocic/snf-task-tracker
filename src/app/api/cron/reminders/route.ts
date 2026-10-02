import { NextResponse, type NextRequest } from "next/server";
import { addDays, today } from "@/lib/dates";
import { notify } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase/server";

// Daily reminders, called once each morning by .github/workflows/reminders.yml:
//   - "due tomorrow" for open tasks due tomorrow
//   - "overdue" once, on the first day a task is late (no daily nagging)
// Protected by CRON_SECRET (Authorization: Bearer <secret>).
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = today();
  const admin = createAdminClient();
  const { data: tasks, error } = await admin
    .from("tasks")
    .select("id, due_date, task_assignees(user_id)")
    .in("due_date", [addDays(now, 1), addDays(now, -1)])
    .not("status", "in", "(done,waiting_client)");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sent = 0;
  for (const task of tasks ?? []) {
    const recipients = (task.task_assignees as { user_id: string }[]).map((a) => a.user_id);
    if (!recipients.length) continue;
    await notify({
      event: task.due_date === addDays(now, 1) ? "task_due_tomorrow" : "task_overdue",
      taskId: task.id,
      recipientIds: recipients,
    });
    sent++;
  }
  return NextResponse.json({ ok: true, tasks: sent });
}
