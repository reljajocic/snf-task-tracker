import { describe, expect, it } from "vitest";
import { safeHref } from "./safe-url";

describe("safeHref", () => {
  it("keeps web links and adds https to bare ones", () => {
    expect(safeHref("https://drive.google.com/x")).toBe("https://drive.google.com/x");
    expect(safeHref(" drive.google.com/x ")).toBe("https://drive.google.com/x");
    expect(safeHref("mailto:a@b.rs")).toBe("mailto:a@b.rs");
  });
  it("drops script and data links", () => {
    expect(safeHref("javascript:alert(1)")).toBeUndefined();
    expect(safeHref(" JavaScript:alert(1)")).toBeUndefined();
    expect(safeHref("data:text/html,<script>alert(1)</script>")).toBeUndefined();
    expect(safeHref("")).toBeUndefined();
    expect(safeHref(null)).toBeUndefined();
  });
});
