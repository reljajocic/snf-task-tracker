import { describe, expect, it } from "vitest";
import { formatEstimate, parseEstimate } from "./tasks";

describe("estimates", () => {
  it("parses common shorthand", () => {
    expect(parseEstimate("2h")).toBe(120);
    expect(parseEstimate("1.5h")).toBe(90);
    expect(parseEstimate("1,5h")).toBe(90);
    expect(parseEstimate("90m")).toBe(90);
    expect(parseEstimate("1h 30m")).toBe(90);
    expect(parseEstimate("45")).toBe(45);
    expect(parseEstimate("")).toBeNull();
    expect(parseEstimate("soon")).toBeNull();
    expect(parseEstimate("0")).toBeNull();
  });

  it("formats minutes back", () => {
    expect(formatEstimate(120)).toBe("2h");
    expect(formatEstimate(90)).toBe("1h 30m");
    expect(formatEstimate(30)).toBe("30m");
    expect(formatEstimate(null)).toBeNull();
  });
});
