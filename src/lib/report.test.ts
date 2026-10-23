import { describe, expect, it } from "vitest";
import { computeReport, nextMonth, type ReportVideo } from "./report";

const v = (id: string, publish: string, extra: Partial<ReportVideo> = {}): ReportVideo => ({
  id,
  title: id,
  publish_date: publish,
  published_at: null,
  phase: 2,
  content_type: null,
  profile: null,
  post_url: null,
  dropped_at: null,
  ...extra,
});

describe("monthly report", () => {
  it("counts planned against published, on time, by type and profile; dropped ones don't count", () => {
    const r = computeReport(
      "2026-10",
      [
        v("a", "2026-10-06", { phase: 5, published_at: "2026-10-06", content_type: "COMPLEX", profile: "Instagram & Facebook", post_url: "https://instagram.com/p/a" }),
        v("b", "2026-10-08", { phase: 5, published_at: "2026-10-09", content_type: "COMPLEX", profile: "TikTok" }),
        v("c", "2026-10-20"),
        v("d", "2026-10-21", { dropped_at: "2026-10-19" }),
      ],
      { shootDays: 2, shot: 7, versions: [{ id: "v1", created_at: "2026-10-01T10:00:00Z" }], approvals: [{ version_id: "v1", created_at: "2026-10-03T10:00:00Z" }] },
      "Other",
    );
    expect([r.planned, r.published, r.onTime]).toEqual([3, 2, 1]);
    expect(r.byType).toEqual([{ label: "COMPLEX", n: 2 }]);
    expect(r.byProfile.map((p) => p.label)).toEqual(["Instagram & Facebook", "TikTok"]);
    expect(r.posts.map((p) => [p.id, p.date, p.url])).toEqual([
      ["a", "2026-10-06", "https://instagram.com/p/a"],
      ["b", "2026-10-09", null],
    ]);
    expect(r.work).toEqual({ shootDays: 2, shot: 7, cutsSent: 1, approved: 1, avgApprovalDays: 2 });
  });

  it("knows the next month across a year", () => {
    expect(nextMonth("2026-12")).toBe("2027-01");
  });
});
