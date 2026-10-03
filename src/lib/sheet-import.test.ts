import { describe, expect, it } from "vitest";
import { csvExportUrl, parseCsv, parseShootSheet } from "./sheet-import";

const SAMPLE = [
  ",SNIMANJE četvrtak [28. 5. 2026.],,,KLIKNI OVDE,,,",
  ",,,,,,,",
  "REDNI BROJ,STATUS,VREME,OSOBA,TIP,NASLOV,OPIS/TEXT,NAPOMENA",
  ",,,,,,,",
  '1,FILMED,20:00,Marko Rosandić,FUN,"Da si gazda, sta bi promenio/la?",Anketa.,',
  '2,FILMED,,Marko Rosandić,INFO,Manje trng,"HOOK: Manje treniranja?\nCTA 1: Ostani do kraja.\nBODY: Prva.\nDruga.",',
  '9,NOT FILMED,21:10,Anđela,INFO,Mlitave ruke,"HOOK: Rešenje",ceo link: https://vt.tiktok.com/x/',
  ",,,,,,,",
].join("\n");

describe("shoot sheet import", () => {
  it("parses quoted CSV", () => {
    expect(parseCsv('a,"b, c","d ""e"""\n1,2,3')).toEqual([
      ["a", "b, c", 'd "e"'],
      ["1", "2", "3"],
    ]);
  });

  it("reads date, videos, inherited times and call times", () => {
    const shoot = parseShootSheet(SAMPLE);
    expect(shoot.date).toBe("2026-05-28");
    expect(shoot.videos.map((v) => [v.status, v.time, v.person, v.type, v.title])).toEqual([
      ["shot", "20:00", "Marko Rosandić", "FUN", "Da si gazda, sta bi promenio/la?"],
      ["shot", "20:00", "Marko Rosandić", "INFO", "Manje trng"],
      ["not_shot", "21:10", "Anđela", "INFO", "Mlitave ruke"],
    ]);
    expect(shoot.videos[1].script.map((s) => s.label)).toEqual(["HOOK", "CTA 1", "BODY"]);
    expect(shoot.videos[2].reference).toBe("https://vt.tiktok.com/x/");
    expect(shoot.videos[2].note).toBe("");
    expect(shoot.callTimes).toEqual([
      { time: "20:00", name: "Marko Rosandić", note: "" },
      { time: "21:10", name: "Anđela", note: "" },
    ]);
  });

  it("builds the CSV export link from a normal sheet link", () => {
    expect(csvExportUrl("https://docs.google.com/spreadsheets/d/AbC_1-2/edit?gid=123#gid=123")).toBe(
      "https://docs.google.com/spreadsheets/d/AbC_1-2/export?format=csv&gid=123",
    );
    expect(csvExportUrl("https://example.com")).toBeNull();
  });
});
