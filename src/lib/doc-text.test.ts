import { describe, expect, it } from "vitest";
import { docBlocks, docInline, docSnippet } from "./doc-text";

describe("docBlocks", () => {
  it("reads headings, lists and paragraphs", () => {
    expect(docBlocks("# Brand\nCalm, warm.\nNo slang.\n\n## Don't\n- red\n* shouting\n  in caps\n1. first\n2) second\n\nEnd")).toEqual([
      { kind: "heading", level: 1, text: "Brand" },
      { kind: "paragraph", text: "Calm, warm.\nNo slang." },
      { kind: "heading", level: 2, text: "Don't" },
      { kind: "list", ordered: false, items: ["red", "shouting in caps"] },
      { kind: "list", ordered: true, items: ["first", "second"] },
      { kind: "paragraph", text: "End" },
    ]);
  });

  it("is empty for an empty doc", () => {
    expect(docBlocks("  \n\n")).toEqual([]);
  });
});

describe("docInline", () => {
  it("finds bold and links, dropping unsafe ones", () => {
    expect(docInline("Ask **Ana** first, see drive.google.com/x/abc. Or https://dropbox.com/s/a?dl=0, not javascript:alert(1)")).toEqual([
      { kind: "text", text: "Ask " },
      { kind: "bold", text: "Ana" },
      { kind: "text", text: " first, see " },
      { kind: "link", text: "drive.google.com/x/abc", href: "https://drive.google.com/x/abc" },
      { kind: "text", text: ". Or " },
      { kind: "link", text: "dropbox.com/s/a?dl=0", href: "https://dropbox.com/s/a?dl=0" },
      { kind: "text", text: ", not javascript:alert(1)" },
    ]);
  });
});

describe("docSnippet", () => {
  it("is the first text under the title, plain and short", () => {
    expect(docSnippet("# Tone\n- **calm**\n- warm")).toBe("calm · warm");
    expect(docSnippet("x".repeat(100), 10)).toBe("xxxxxxxxx…");
    expect(docSnippet("")).toBe("");
  });
});
