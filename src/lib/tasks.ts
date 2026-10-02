import { dueLabel, isOverdue, type DueLabel, type IsoDate } from "@/lib/dates";

export const STATUSES = ["todo", "in_progress", "waiting_client", "done"] as const;
export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export const TASK_TYPES = ["script", "shoot", "edit", "revision", "publish", "meeting", "admin", "other"] as const;

/** Video phases 0–4; phase 5 means published. */
export const PHASES = ["script", "shoot", "edit", "revision", "publish"] as const;
export const PUBLISHED_PHASE = 5;
export const SHOT_STATUSES = ["to_shoot", "shot", "not_shot"] as const;
export type ShotStatus = (typeof SHOT_STATUSES)[number];

/** Default script sections for a new video (design: Hook, Lead, Body, CTA). */
export const SCRIPT_SECTIONS = ["Hook", "Lead", "Body", "Open loop", "CTA"] as const;
export type ScriptSection = { label: string; text: string };

export type TaskStatus = (typeof STATUSES)[number];
export type TaskPriority = (typeof PRIORITIES)[number];
export type TaskType = (typeof TASK_TYPES)[number];

export const STATUS_COLOR: Record<TaskStatus, string> = {
  todo: "var(--status-todo)",
  in_progress: "var(--status-in-progress)",
  waiting_client: "var(--status-waiting)",
  done: "var(--status-done)",
};

export const PRIORITY_COLOR: Record<TaskPriority, string> = {
  low: "var(--prio-low)",
  medium: "var(--prio-medium)",
  high: "var(--prio-high)",
  urgent: "var(--prio-urgent)",
};

export type Person = {
  id: string;
  full_name: string;
  initials: string;
  avatar_bg: string;
  avatar_fg: string;
};

export type Task = {
  id: string;
  kind: "task" | "video" | "subtask";
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType | null;
  due_date: IsoDate | null;
  estimate_minutes: number | null;
  drive_url: string | null;
  position: number;
  status_changed_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  client: { id: string; name: string } | null;
  project: { id: string; name: string } | null;
  parent: { id: string; title: string } | null;
  assignees: Person[];
  // Video fields (kind = "video"); null/empty for plain tasks.
  phase: number | null;
  content_type: string | null;
  on_camera: string | null;
  location: string | null;
  script: ScriptSection[];
  reference_url: string | null;
  note: string | null;
  publish_date: IsoDate | null;
  published_at: IsoDate | null;
  shoot_id: string | null;
  shoot_time: string | null;
  shot_status: ShotStatus | null;
  shoot: { id: string; date: IsoDate; location: string | null } | null;
  subtask_count: number;
  subtask_done: number;
};

const PERSON_COLS = "id, full_name, initials, avatar_bg, avatar_fg";

/** PostgREST select that returns rows shaped like `RawTask` (see `toTask`). */
export const TASK_SELECT = `
  id, kind, title, description, status, priority, type, due_date, estimate_minutes, drive_url,
  position, status_changed_at, completed_at, created_at, updated_at, created_by,
  client:clients(id, name),
  project:projects(id, name),
  parent:parent_id(id, title),
  task_assignees(profile:profiles(${PERSON_COLS})),
  phase, content_type, on_camera, location, script, reference_url, note,
  publish_date, published_at, shoot_id, shoot_time, shot_status,
  shoot:shoot_days(id, date, location),
  subtasks:tasks!parent_id(status)
`;

export type RawTask = Omit<Task, "assignees" | "subtask_count" | "subtask_done"> & {
  task_assignees: { profile: Person | null }[];
  subtasks: { status: TaskStatus }[] | null;
};

export function toTask(raw: RawTask): Task {
  const { task_assignees, subtasks, ...rest } = raw;
  return {
    ...rest,
    script: Array.isArray(rest.script) ? rest.script : [],
    subtask_count: subtasks?.length ?? 0,
    subtask_done: subtasks?.filter((x) => x.status === "done").length ?? 0,
    assignees: task_assignees
      .map((a) => a.profile)
      .filter((p): p is Person => p !== null)
      .sort((a, b) => a.full_name.localeCompare(b.full_name)),
  };
}

export const isDone = (t: Pick<Task, "status">) => t.status === "done";

export function taskOverdue(t: Task, today: IsoDate) {
  return isOverdue(t.due_date, today, isDone(t));
}

export function taskDue(t: Task, today: IsoDate): DueLabel | null {
  return t.due_date ? dueLabel(t.due_date, today, isDone(t)) : null;
}

/** Sort by deadline (no deadline last), then title. */
export function byDue(a: Task, b: Task) {
  if (a.due_date !== b.due_date) {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date < b.due_date ? -1 : 1;
  }
  return a.title.localeCompare(b.title);
}

/** "2h", "30m", "1h 30m" — estimates are stored in minutes. */
export function formatEstimate(minutes: number | null): string | null {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** Parses "2h", "1.5h", "90m", "1h 30m", "45" (minutes) → minutes, or null. */
export function parseEstimate(input: string): number | null {
  const s = input.trim().toLowerCase().replace(",", ".");
  if (!s) return null;
  const hm = s.match(/^(?:(\d+(?:\.\d+)?)\s*h)?\s*(?:(\d+)\s*m(?:in)?)?$/);
  if (hm && (hm[1] || hm[2])) {
    const total = Math.round(Number(hm[1] ?? 0) * 60 + Number(hm[2] ?? 0));
    return total > 0 ? total : null;
  }
  if (/^\d+$/.test(s)) return Number(s) > 0 ? Number(s) : null;
  return null;
}

/** "Edit · 3/5", or "Published". Labels come from i18n; this returns the parts. */
export function phaseInfo(phase: number | null) {
  const p = phase ?? 0;
  return { index: Math.min(p, PHASES.length - 1), published: p >= PUBLISHED_PHASE, step: Math.min(p + 1, PHASES.length) };
}

/** Client-facing status of a video in the posting schedule. */
export type PostingStatus = "published" | "not_published" | "shot" | "not_shot" | "to_shoot";

export function postingStatus(t: Pick<Task, "phase" | "shot_status" | "publish_date">, today: IsoDate): PostingStatus {
  if ((t.phase ?? 0) >= PUBLISHED_PHASE) return "published";
  if (t.publish_date && t.publish_date < today) return "not_published";
  if (t.shot_status === "shot" || (t.phase ?? 0) >= 2) return "shot";
  if (t.shot_status === "not_shot") return "not_shot";
  return "to_shoot";
}

export const POSTING_STATUS_COLOR: Record<PostingStatus, string> = {
  published: "var(--status-done)",
  shot: "var(--status-in-progress)",
  to_shoot: "var(--status-todo)",
  not_shot: "var(--prio-urgent)",
  not_published: "var(--prio-urgent)",
};
