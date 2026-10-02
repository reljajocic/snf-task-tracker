import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  dueLabel,
  formatDate,
  formatShortDate,
  isOverdue,
  isoWeek,
  startOfWeek,
  today,
  weekdayIndex,
} from "./dates";

// The prototype's "today": Friday 02.10.2026.
const TODAY = "2026-10-02";

describe("formatting", () => {
  it("uses DD.MM.YYYY", () => {
    expect(formatDate("2026-10-05")).toBe("05.10.2026");
    expect(formatShortDate("2026-10-05")).toBe("05.10.");
  });
});

describe("calendar math", () => {
  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-30", -1)).toBe("2026-03-29"); // DST weekend in Europe
  });

  it("counts days between dates", () => {
    expect(daysBetween(TODAY, "2026-10-05")).toBe(3);
    expect(daysBetween(TODAY, "2026-09-11")).toBe(-21);
  });

  it("starts weeks on Monday", () => {
    expect(weekdayIndex("2026-10-05")).toBe(0); // Monday
    expect(weekdayIndex("2026-10-04")).toBe(6); // Sunday
    expect(startOfWeek(TODAY)).toBe("2026-09-28");
    expect(startOfWeek("2026-10-04")).toBe("2026-09-28");
  });

  it("computes ISO week numbers", () => {
    expect(isoWeek("2026-10-05")).toBe(41);
    expect(isoWeek("2027-01-01")).toBe(53);
  });

  it("resolves today in Belgrade, not UTC", () => {
    // 23:30 UTC on 1 Oct is already 2 Oct in Belgrade (UTC+2).
    expect(today(new Date("2026-10-01T23:30:00Z"))).toBe("2026-10-02");
  });
});

describe("dueLabel", () => {
  it("follows the relative deadline rules", () => {
    expect(dueLabel("2026-10-01", TODAY)).toEqual({ kind: "overdue", days: 1 });
    expect(dueLabel("2026-09-11", TODAY)).toEqual({ kind: "overdue", days: 21 });
    expect(dueLabel(TODAY, TODAY)).toEqual({ kind: "today" });
    expect(dueLabel("2026-10-03", TODAY)).toEqual({ kind: "tomorrow" });
    expect(dueLabel("2026-10-05", TODAY)).toEqual({ kind: "weekday", weekday: 0 });
    expect(dueLabel("2026-10-08", TODAY)).toEqual({ kind: "weekday", weekday: 3 });
    expect(dueLabel("2026-10-09", TODAY)).toEqual({ kind: "inDays", days: 7 });
    expect(dueLabel("2026-09-01", TODAY, true)).toEqual({ kind: "done" });
  });
});

describe("isOverdue", () => {
  it("is only overdue before today and when not done", () => {
    expect(isOverdue("2026-10-01", TODAY, false)).toBe(true);
    expect(isOverdue(TODAY, TODAY, false)).toBe(false);
    expect(isOverdue("2026-10-01", TODAY, true)).toBe(false);
    expect(isOverdue(null, TODAY, false)).toBe(false);
  });
});
