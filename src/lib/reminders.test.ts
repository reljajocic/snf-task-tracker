import { describe, expect, it } from "vitest";
import { addMonths, nextMonthly } from "./reminders";

describe("client reminders", () => {
  it("moves to the same day next month, or the month's last day", () => {
    expect(addMonths("2026-11-01", 1)).toBe("2026-12-01");
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-15");
    expect(addMonths("2027-01-31", 1)).toBe("2027-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
  });

  it("a monthly reminder comes back after today", () => {
    expect(nextMonthly("2026-11-01", "2026-11-01")).toBe("2026-12-01");
    // The job didn't run for a while: no backlog, just the next one.
    expect(nextMonthly("2026-08-01", "2026-11-03")).toBe("2026-12-01");
    expect(nextMonthly("2027-01-31", "2027-03-01")).toBe("2027-03-31");
  });
});
