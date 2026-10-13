import { describe, expect, it } from "vitest";
import { canReturnToIdeas, pendingReshoot, type ShootAttempt } from "./tasks";

const attempt: ShootAttempt = {
  shoot_date: "2026-09-23",
  location: "Novo Naselje",
  shoot_time: null,
  on_camera: "Petar",
  shot_status: "shot",
  publish_date: null,
  reason: "loš sagovornik",
  returned_at: "2026-10-13T09:12:34Z",
  returned_by: null,
};
const idea = { dropped_at: null, phase: 0, shot_status: "to_shoot" as const, shoot_id: null, publish_date: null, shoot_history: [] as ShootAttempt[] };

describe("reshoot state", () => {
  it("only filmed, scheduled or on-a-shoot videos can go back to ideas", () => {
    expect(canReturnToIdeas(idea)).toBe(false);
    expect(canReturnToIdeas({ ...idea, shoot_id: "s1", phase: 1 })).toBe(true);
    expect(canReturnToIdeas({ ...idea, shot_status: "shot", phase: 2 })).toBe(true);
    expect(canReturnToIdeas({ ...idea, publish_date: "2026-10-20" })).toBe(true);
    expect(canReturnToIdeas({ ...idea, phase: 5, shot_status: "shot" })).toBe(false);
    expect(canReturnToIdeas({ ...idea, shoot_id: "s1", dropped_at: "2026-10-01" })).toBe(false);
  });

  it("plain ideas have no reshoot mark; returned ones show the latest reason until they're on a shoot again", () => {
    expect(pendingReshoot(idea)).toBeNull();
    const returned = { ...idea, shoot_history: [attempt] };
    expect(pendingReshoot(returned)?.reason).toBe("loš sagovornik");
    expect(pendingReshoot({ ...returned, shoot_id: "s2", phase: 1 })).toBeNull();
  });
});
