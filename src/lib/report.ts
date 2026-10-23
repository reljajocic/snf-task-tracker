import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

// The client's monthly report, worked out from the app itself: what went out against what was planned,
// what went out on time, by type and by profile, every post with its link, and the work behind it
// (shoot days, cuts sent, approvals and how long they took). Numbers from the networks come later.

export type ReportVideo = {
  id: string;
  title: string;
  publish_date: string | null;
  published_at: string | null;
  phase: number | null;
  content_type: string | null;
  profile: string | null;
  post_url: string | null;
  dropped_at: string | null;
};

export type MonthReport = {
  month: string;
  planned: number;
  published: number;
  onTime: number;
  byType: { label: string; n: number }[];
  byProfile: { label: string; n: number }[];
  posts: { id: string; title: string; date: string; profile: string | null; type: string | null; url: string | null }[];
  work: { shootDays: number; shot: number; cutsSent: number; approved: number; avgApprovalDays: number | null };
};

const DAY = 86_400_000;
export const nextMonth = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);
};

const tally = (values: (string | null)[], none: string) =>
  [...values.reduce((m, v) => m.set(v || none, (m.get(v || none) ?? 0) + 1), new Map<string, number>())]
    .map(([label, n]) => ({ label, n }))
    .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label));

/** The numbers, from rows already loaded (kept apart from the queries so it can be tested). */
export function computeReport(
  month: string,
  videos: ReportVideo[],
  work: { shootDays: number; shot: number; versions: { id: string; created_at: string }[]; approvals: { version_id: string | null; created_at: string }[] },
  none: string,
): MonthReport {
  const planned = videos.filter((v) => !v.dropped_at && v.publish_date?.startsWith(month));
  const out = planned.filter((v) => (v.phase ?? 0) >= 5);
  const versionAt = new Map(work.versions.map((v) => [v.id, v.created_at]));
  const waits = work.approvals
    .map((a) => (a.version_id && versionAt.has(a.version_id) ? (Date.parse(a.created_at) - Date.parse(versionAt.get(a.version_id)!)) / DAY : null))
    .filter((d): d is number => d !== null && d >= 0);
  return {
    month,
    planned: planned.length,
    published: out.length,
    onTime: out.filter((v) => !v.published_at || !v.publish_date || v.published_at <= v.publish_date).length,
    byType: tally(out.map((v) => v.content_type), none),
    byProfile: tally(out.map((v) => v.profile), none),
    posts: out
      .map((v) => ({ id: v.id, title: v.title, date: v.published_at ?? v.publish_date!, profile: v.profile, type: v.content_type, url: v.post_url }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    work: {
      shootDays: work.shootDays,
      shot: work.shot,
      cutsSent: work.versions.filter((v) => v.created_at.startsWith(month)).length,
      approved: work.approvals.length,
      avgApprovalDays: waits.length ? Math.round((waits.reduce((s, d) => s + d, 0) / waits.length) * 10) / 10 : null,
    },
  };
}

/** Loads a client's month with the given client: the team's (through RLS) or the portal's (server-side). */
export async function buildMonthReport(db: SupabaseClient<Database>, clientId: string, month: string, none: string): Promise<MonthReport> {
  const from = `${month}-01`;
  const to = `${nextMonth(month)}-01`;
  const [{ data: videos }, { data: shoots }, { data: versions }, { data: approvals }] = await Promise.all([
    db
      .from("tasks")
      .select("id, title, publish_date, published_at, phase, content_type, profile, post_url, dropped_at")
      .eq("client_id", clientId)
      .eq("kind", "video")
      .gte("publish_date", from)
      .lt("publish_date", to),
    db.from("shoot_days").select("id").eq("client_id", clientId).gte("date", from).lt("date", to),
    // Cuts sent this month, and older ones approved this month (for how long the approval took).
    db.from("video_versions").select("id, created_at, task:tasks!inner(client_id)").eq("task.client_id", clientId).gte("created_at", addMonths(from, -2)).lt("created_at", to),
    db
      .from("approvals")
      .select("version_id, created_at, task:tasks!inner(client_id)")
      .eq("task.client_id", clientId)
      .eq("kind", "video")
      .eq("status", "approved")
      .gte("created_at", from)
      .lt("created_at", to),
  ]);
  const shootIds = (shoots ?? []).map((s) => s.id);
  const { count: shot } = shootIds.length
    ? await db.from("tasks").select("id", { count: "exact", head: true }).in("shoot_id", shootIds).eq("shot_status", "shot")
    : { count: 0 };
  return computeReport(
    month,
    (videos ?? []) as ReportVideo[],
    { shootDays: shootIds.length, shot: shot ?? 0, versions: versions ?? [], approvals: approvals ?? [] },
    none,
  );
}

function addMonths(isoDay: string, n: number) {
  const [y, m] = isoDay.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 10);
}
