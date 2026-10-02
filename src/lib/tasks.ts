import { dueLabel, isOverdue, type DueLabel, type IsoDate } from "@/lib/dates";

export const STATUSES = ["todo", "in_progress", "waiting_client", "done"] as const;
export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export const TASK_TYPES = ["script", "shoot", "edit", "revision", "publish", "meeting", "admin", "other"] as const;

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
};

const PERSON_COLS = "id, full_name, initials, avatar_bg, avatar_fg";

/** PostgREST select that returns rows shaped like `RawTask` (see `toTask`). */
export const TASK_SELECT = `
  id, kind, title, description, status, priority, type, due_date, estimate_minutes, drive_url,
  position, status_changed_at, completed_at, created_at, updated_at, created_by,
  client:clients(id, name),
  project:projects(id, name),
  parent:parent_id(id, title),
  task_assignees(profile:profiles(${PERSON_COLS}))
`;

export type RawTask = Omit<Task, "assignees"> & {
  task_assignees: { profile: Person | null }[];
};

export function toTask(raw: RawTask): Task {
  const { task_assignees, ...rest } = raw;
  return {
    ...rest,
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
