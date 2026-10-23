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
  posts: { id: string; title: string; date: string; profile: string | null; type: string | null; url: string | null; metrics: PostMetrics | null }[];
  work: { shootDays: number; shot: number; cutsSent: number; approved: number; avgApprovalDays: number | null };
  /** From Instagram, when the client's account is connected and posts carry their link; null otherwise. */
  social: { totals: PostMetrics; posts: number; followersStart: number | null; followersEnd: number | null } | null;
};

export type PostMetrics = { views: number | null; reach: number | null; likes: number | null; comments: number | null; saved: number | null; shares: number | null };
const METRIC_KEYS = ["views", "reach", "likes", "comments", "saved", "shares"] as const;

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
  social: { metrics: Map<string, PostMetrics>; followersStart: number | null; followersEnd: number | null } = { metrics: new Map(), followersStart: null, followersEnd: null },
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
      .map((v) => ({ id: v.id, title: v.title, date: v.published_at ?? v.publish_date!, profile: v.profile, type: v.content_type, url: v.post_url, metrics: social.metrics.get(v.id) ?? null }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    work: {
      shootDays: work.shootDays,
      shot: work.shot,
      cutsSent: work.versions.filter((v) => v.created_at.startsWith(month)).length,
      approved: work.approvals.length,
      avgApprovalDays: waits.length ? Math.round((waits.reduce((s, d) => s + d, 0) / waits.length) * 10) / 10 : null,
    },
    social: (() => {
      const measured = out.map((v) => social.metrics.get(v.id)).filter((m): m is PostMetrics => !!m);
      if (!measured.length && social.followersEnd === null) return null;
      const totals = Object.fromEntries(
        METRIC_KEYS.map((k) => [k, measured.some((m) => m[k] !== null) ? measured.reduce((sum, m) => sum + (m[k] ?? 0), 0) : null]),
      ) as PostMetrics;
      return { totals, posts: measured.length, followersStart: social.followersStart, followersEnd: social.followersEnd };
    })(),
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
  // Instagram: the posts' numbers, and followers at the month's start (last reading before it) and end.
  const ids = (videos ?? []).map((v) => v.id);
  const [{ data: metrics }, { data: before }, { data: during }] = await Promise.all([
    ids.length ? db.from("post_metrics").select("task_id, views, reach, likes, comments, saved, shares").in("task_id", ids) : Promise.resolve({ data: [] }),
    db.from("instagram_followers").select("followers").eq("client_id", clientId).lt("day", from).order("day", { ascending: false }).limit(1),
    db.from("instagram_followers").select("day, followers").eq("client_id", clientId).gte("day", from).lt("day", to).order("day"),
  ]);
  const first = before?.[0]?.followers ?? during?.[0]?.followers ?? null;
  const last = during?.length ? during[during.length - 1].followers : null;
  const { count: shot } = shootIds.length
    ? await db.from("tasks").select("id", { count: "exact", head: true }).in("shoot_id", shootIds).eq("shot_status", "shot")
    : { count: 0 };
  return computeReport(
    month,
    (videos ?? []) as ReportVideo[],
    { shootDays: shootIds.length, shot: shot ?? 0, versions: versions ?? [], approvals: approvals ?? [] },
    none,
    { metrics: new Map((metrics ?? []).map(({ task_id, ...m }) => [task_id, m])), followersStart: first, followersEnd: last },
  );
}

function addMonths(isoDay: string, n: number) {
  const [y, m] = isoDay.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 10);
}
