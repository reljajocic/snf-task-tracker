import { describe, expect, it } from "vitest";
import { sectionsToText, textToSections } from "./script-text";

describe("script text", () => {
  it("splits the team's HOOK/CTA/BODY format into sections", () => {
    const text = "HOOK: Manje treniranja?\nCTA 1: Ostani do kraja.\nBODY: Prva stvar.\nDruga stvar.\nCTA 2: Zakaži.";
    expect(textToSections(text)).toEqual([
      { label: "HOOK", text: "Manje treniranja?" },
      { label: "CTA 1", text: "Ostani do kraja." },
      { label: "BODY", text: "Prva stvar.\nDruga stvar." },
      { label: "CTA 2", text: "Zakaži." },
    ]);
  });

  it("keeps unlabeled scripts as one section", () => {
    expect(textToSections("Anketa.")).toEqual([{ label: "", text: "Anketa." }]);
    expect(textToSections("Mušterija: Mogu li?\nPult: PRSNEŠ")).toEqual([{ label: "", text: "Mušterija: Mogu li?\nPult: PRSNEŠ" }]);
  });

  it("round-trips", () => {
    const sections = [
      { label: "HOOK", text: "A" },
      { label: "BODY", text: "B\nC" },
    ];
    expect(textToSections(sectionsToText(sections))).toEqual(sections);
  });
});
