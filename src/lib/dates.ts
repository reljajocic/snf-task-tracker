// Calendar dates are plain "YYYY-MM-DD" strings (Postgres `date`), never Date objects,
// so a deadline can't drift a day because of time zones.

import { TIME_ZONE } from "@/lib/config";

export type IsoDate = string;

const DAY_MS = 86_400_000;

function toUtcMs(iso: IsoDate): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtcMs(ms: number): IsoDate {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Today's date in the agency's time zone (Belgrade), regardless of server location. */
export function today(now: Date = new Date(), timeZone: string = TIME_ZONE): IsoDate {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  return fromUtcMs(toUtcMs(iso) + days * DAY_MS);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS);
}

/** 0 = Monday … 6 = Sunday (weeks start on Monday). */
export function weekdayIndex(iso: IsoDate): number {
  return (new Date(toUtcMs(iso)).getUTCDay() + 6) % 7;
}

export function startOfWeek(iso: IsoDate): IsoDate {
  return addDays(iso, -weekdayIndex(iso));
}

/** ISO-8601 week number (weeks start Monday; week 1 contains the first Thursday). */
export function isoWeek(iso: IsoDate): number {
  const thursday = addDays(iso, 3 - weekdayIndex(iso));
  const yearStart = `${thursday.slice(0, 4)}-01-01`;
  return Math.floor(daysBetween(yearStart, thursday) / 7) + 1;
}

/** 05.10.2026 */
export function formatDate(iso: IsoDate): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

/** 05.10. — for dense views where the year is clear from context. */
export function formatShortDate(iso: IsoDate): string {
  const [, m, d] = iso.split("-");
  return `${d}.${m}.`;
}

export type DueLabel =
  | { kind: "done" }
  | { kind: "overdue"; days: number }
  | { kind: "today" }
  | { kind: "tomorrow" }
  | { kind: "weekday"; weekday: number }
  | { kind: "inDays"; days: number };

/**
 * Relative deadline, per the spec: < 0 overdue, 0 today, 1 tomorrow,
 * 2–6 weekday name, otherwise "in N days". Rendering is done via i18n messages.
 */
export function dueLabel(due: IsoDate, todayIso: IsoDate, isDone = false): DueLabel {
  if (isDone) return { kind: "done" };
  const diff = daysBetween(todayIso, due);
  if (diff < 0) return { kind: "overdue", days: -diff };
  if (diff === 0) return { kind: "today" };
  if (diff === 1) return { kind: "tomorrow" };
  if (diff <= 6) return { kind: "weekday", weekday: weekdayIndex(due) };
  return { kind: "inDays", days: diff };
}

/** Overdue: deadline before today and not done. */
export function isOverdue(due: IsoDate | null, todayIso: IsoDate, isDone: boolean): boolean {
  return due !== null && !isDone && due < todayIso;
}
