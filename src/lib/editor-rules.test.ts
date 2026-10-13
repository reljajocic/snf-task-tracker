import { describe, expect, it } from "vitest";
import { parseEditorRules, pickEditor } from "./editor-rules";

// NoLimit: Vučko edits Wednesday/Friday and INFO/FUN, Relja Monday and GYM.
const rules = parseEditorRules([
  { editor_id: "vucko", days: [2, 4], types: ["info", "FUN"] },
  { editor_id: "relja", days: [0], types: ["GYM"] },
  { editor_id: "", days: [1] },
]);

describe("editor rules", () => {
  it("parses and cleans rules", () => {
    expect(rules).toEqual([
      { editor_id: "vucko", days: [2, 4], types: ["INFO", "FUN"] },
      { editor_id: "relja", days: [0], types: ["GYM"] },
    ]);
  });

  it("the posting day wins over the content type", () => {
    expect(pickEditor(rules, null, "2026-10-05", "FUN")).toBe("relja"); // Monday
    expect(pickEditor(rules, null, "2026-10-07", "GYM")).toBe("vucko"); // Wednesday
  });

  it("falls back to the type, then to the default editor", () => {
    expect(pickEditor(rules, "uros", "2026-10-06", "GYM")).toBe("relja"); // Tuesday
    expect(pickEditor(rules, "uros", "2026-10-06", "PROMO")).toBe("uros");
    expect(pickEditor([], null, "2026-10-06", null)).toBeNull();
  });

  it("a rule with no days and no types covers everything else", () => {
    const vivi = parseEditorRules([{ editor_id: "natasa", days: [], types: [] }]);
    expect(pickEditor(vivi, "relja", "2026-10-06", "REEL")).toBe("natasa");
    expect(pickEditor(vivi, "relja", "2026-10-06", null)).toBe("natasa");
    // A more specific rule still wins.
    const mixed = parseEditorRules([{ editor_id: "natasa", days: [], types: [] }, { editor_id: "marko", days: [], types: ["POST"] }]);
    expect(pickEditor(mixed, "relja", "2026-10-06", "POST")).toBe("marko");
    expect(pickEditor(mixed, "relja", "2026-10-06", "REEL")).toBe("natasa");
  });
});
