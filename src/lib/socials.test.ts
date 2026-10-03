import { describe, expect, it } from "vitest";
import { parseSocials, socialDisplay, socialUrl } from "./socials";

describe("socials", () => {
  it("builds profile links per network", () => {
    expect(socialUrl({ platform: "instagram", handle: "@nolimitgym" })).toBe("https://instagram.com/nolimitgym");
    expect(socialUrl({ platform: "tiktok", handle: "nolimitgym" })).toBe("https://www.tiktok.com/@nolimitgym");
    expect(socialUrl({ platform: "facebook", handle: "https://fb.com/x" })).toBe("https://fb.com/x");
  });

  it("cleans input", () => {
    expect(parseSocials([{ platform: "tiktok", handle: " a " }, { platform: "nope", handle: "b" }, { platform: "x", handle: "" }])).toEqual([
      { platform: "tiktok", handle: "a" },
      { platform: "other", handle: "b" },
    ]);
    expect(parseSocials("garbage")).toEqual([]);
    expect(socialDisplay({ platform: "instagram", handle: "nolimit" })).toBe("@nolimit");
  });
});
