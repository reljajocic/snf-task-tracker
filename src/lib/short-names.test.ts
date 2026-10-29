import { describe, expect, it } from "vitest";
import { shortNames } from "./short-names";

describe("shortNames", () => {
  it("adds the last initial only when a first name repeats", () => {
    expect(shortNames([{ id: "1", full_name: "Marko" }, { id: "2", full_name: "Marko Vučurović" }, { id: "3", full_name: "Uros" }, { id: "4", full_name: "Andjela Vlaisavljevic" }])).toEqual({
      "1": "Marko",
      "2": "Marko V.",
      "3": "Uros",
      "4": "Andjela",
    });
  });
});
