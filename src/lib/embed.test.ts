import { describe, expect, it } from "vitest";
import { dropboxVideoUrl, embedUrl } from "./embed";

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

describe("dropboxVideoUrl", () => {
  it("plays shared video files directly, keeping the link's key", () => {
    expect(dropboxVideoUrl("https://www.dropbox.com/scl/fi/abc123/Cut%20v2.mp4?rlkey=k9&st=x&dl=0")).toBe(
      "https://www.dropbox.com/scl/fi/abc123/Cut%20v2.mp4?rlkey=k9&st=x&raw=1",
    );
    expect(dropboxVideoUrl("https://dropbox.com/s/xyz/reel.MOV?dl=0")).toBe("https://www.dropbox.com/s/xyz/reel.MOV?raw=1");
  });
  it("leaves folders, other files and other hosts alone", () => {
    expect(dropboxVideoUrl("https://www.dropbox.com/scl/fo/abc/folder?rlkey=k&dl=0")).toBeNull();
    expect(dropboxVideoUrl("https://www.dropbox.com/scl/fi/abc/brief.pdf?rlkey=k&dl=0")).toBeNull();
    expect(dropboxVideoUrl("https://drive.google.com/file/d/ABC/view")).toBeNull();
    expect(dropboxVideoUrl("nope")).toBeNull();
  });
});
