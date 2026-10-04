import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import sr from "../../messages/sr.json";

const keys = (o: object, prefix = ""): string[] =>
  Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));

describe("translations", () => {
  it("Serbian has exactly the English keys", () => {
    expect(keys(sr).sort()).toEqual(keys(en).sort());
  });
});
