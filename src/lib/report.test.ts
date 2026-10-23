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
    expect(r.social).toBeNull();
  });

  it("adds up the posts' Instagram numbers and the followers' change", () => {
    const m = (views: number, likes: number) => ({ views, reach: null, likes, comments: 1, saved: 0, shares: 2 });
    const r = computeReport(
      "2026-10",
      [v("a", "2026-10-06", { phase: 5 }), v("b", "2026-10-08", { phase: 5 }), v("c", "2026-10-09", { phase: 5 })],
      { shootDays: 0, shot: 0, versions: [], approvals: [] },
      "Other",
      { metrics: new Map([["a", m(1000, 40)], ["b", m(500, 10)]]), followersStart: 1200, followersEnd: 1290 },
    );
    expect(r.social).toEqual({ totals: { views: 1500, reach: null, likes: 50, comments: 2, saved: 0, shares: 4 }, posts: 2, followersStart: 1200, followersEnd: 1290 });
    expect(r.posts.find((p) => p.id === "c")?.metrics).toBeNull();
  });

  it("knows the next month across a year", () => {
    expect(nextMonth("2026-12")).toBe("2027-01");
  });
});
