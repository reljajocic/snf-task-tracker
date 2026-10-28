import { describe, expect, it } from "vitest";
import { FORMAT_COLOR, parseFormat, typeColor } from "./formats";

describe("post formats and type colours", () => {
  it("unknown formats fall back to video", () => {
    expect(parseFormat("photo")).toBe("photo");
    expect(parseFormat("reel")).toBe("video");
    expect(parseFormat(null)).toBe("video");
  });
  it("a type keeps its colour whatever the case or spacing, and never takes a format's", () => {
    expect(typeColor("Complex")).toBe(typeColor(" COMPLEX "));
    for (const t of ["COMPLEX", "EASY", "PODCAST", "REEL", "TREND"]) expect(Object.values(FORMAT_COLOR)).not.toContain(typeColor(t));
  });
});
