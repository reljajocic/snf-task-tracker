// Client reminders ("send the invoice"): once, or every month on the same day.
import type { IsoDate } from "@/lib/dates";

export const REMINDER_REPEATS = ["none", "monthly"] as const;
export type ReminderRepeat = (typeof REMINDER_REPEATS)[number];

export type ClientReminder = { id: string; title: string; remind_on: IsoDate; repeat: ReminderRepeat };

/** The same day `months` later; a day the month doesn't have becomes its last day (31 Jan → 28 Feb). */
export function addMonths(iso: IsoDate, months: number, day = Number(iso.slice(8, 10))): IsoDate {
  const [y, m] = iso.split("-").map(Number);
  const index = y * 12 + (m - 1) + months;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(Math.min(day, last)).padStart(2, "0")}`;
}

/**
 * After a monthly reminder went out: its next date, after `today` (so days the morning job missed
 * aren't sent one after another).
 */
export function nextMonthly(remindOn: IsoDate, today: IsoDate): IsoDate {
  let months = 1;
  while (addMonths(remindOn, months) <= today) months++;
  return addMonths(remindOn, months);
}
