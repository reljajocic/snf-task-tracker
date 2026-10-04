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

  it("keeps a hint written next to the label", () => {
    expect(textToSections("HOOK (snimi sva tri)\nPrvi.\nDrugi.\nCTA 1: Sačuvaj.")).toEqual([
      { label: "HOOK", text: "(snimi sva tri)\nPrvi.\nDrugi." },
      { label: "CTA 1", text: "Sačuvaj." },
    ]);
  });

  it("reads numbered and plural labels", () => {
    expect(textToSections("Hook opcije (snimamo sve 3): Prvi trening je besplatan.\nOpen loop 1: Prostor.\nOPENLOOP 2: Oprema.\nCTA 2: Dođi.")).toEqual([
      { label: "HOOK OPCIJE", text: "(snimamo sve 3) Prvi trening je besplatan." },
      { label: "OPEN LOOP 1", text: "Prostor." },
      { label: "OPEN LOOP 2", text: "Oprema." },
      { label: "CTA 2", text: "Dođi." },
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

import { byShootTime, deriveCallTimes, splitReference } from "./script-text";

describe("shoot helpers", () => {
  it("sorts by time, untimed last", () => {
    const rows = [
      { id: "c", shoot_time: null, created_at: "1" },
      { id: "b", shoot_time: "20:30", created_at: "2" },
      { id: "a", shoot_time: "20:00", created_at: "3" },
    ];
    expect([...rows].sort(byShootTime).map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("derives call times from the rows", () => {
    expect(
      deriveCallTimes([
        { shoot_time: "20:30", on_camera: "Draga" },
        { shoot_time: "20:00", on_camera: "Marko" },
        { shoot_time: "20:00", on_camera: "Marko" },
        { shoot_time: "20:30", on_camera: "Anđela" },
      ]),
    ).toEqual([
      { time: "20:00", name: "Marko" },
      { time: "20:30", name: "Draga, Anđela" },
    ]);
  });

  it("pulls the reference link out of a note", () => {
    expect(splitReference("ceo link: https://vt.tiktok.com/x/")).toEqual({ reference: "https://vt.tiktok.com/x/", rest: "" });
    expect(splitReference("Mora žensko da snima.")).toEqual({ reference: null, rest: "Mora žensko da snima." });
  });
});
