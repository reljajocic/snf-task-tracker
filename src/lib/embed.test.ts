import { describe, expect, it } from "vitest";
import { embedUrl } from "./embed";

describe("embedUrl", () => {
  it("handles common hosts", () => {
    expect(embedUrl("https://drive.google.com/file/d/ABC123/view?usp=sharing")).toBe("https://drive.google.com/file/d/ABC123/preview");
    expect(embedUrl("https://www.youtube.com/watch?v=xyz")).toBe("https://www.youtube.com/embed/xyz");
    expect(embedUrl("https://youtube.com/shorts/abc")).toBe("https://www.youtube.com/embed/abc");
    expect(embedUrl("https://vimeo.com/123456")).toBe("https://player.vimeo.com/video/123456");
    expect(embedUrl("https://example.com/video.mp4")).toBeNull();
    expect(embedUrl("not a url")).toBeNull();
  });
});
