import { describe, expect, it } from "vitest";
import { linkBoxSize, linkView } from "./links";

describe("links on a moodboard", () => {
  it("Instagram posts and reels, TikTok videos and Pinterest pins play on the board", () => {
    expect(linkView("https://www.instagram.com/reel/C9abc_-1/?igsh=xyz")).toMatchObject({ kind: "embed", src: "https://www.instagram.com/reel/C9abc_-1/embed/" });
    expect(linkView("https://www.instagram.com/reels/C9abc/")).toMatchObject({ src: "https://www.instagram.com/reel/C9abc/embed/" });
    expect(linkView("https://instagram.com/someone/p/Cxyz/")).toMatchObject({ src: "https://www.instagram.com/p/Cxyz/embed/" });
    expect(linkView("https://www.tiktok.com/@snf.studio/video/7300000000000000001?lang=en")).toMatchObject({ src: "https://www.tiktok.com/embed/v2/7300000000000000001" });
    expect(linkView("https://pinterest.com/pin/123456789/")).toMatchObject({ src: "https://assets.pinterest.com/ext/embed.html?id=123456789" });
  });

  it("YouTube and Vimeo keep Excalidraw's player; other pages are cards; non-web links are nothing", () => {
    expect(linkView("https://youtu.be/dQw4w9WgXcQ")).toEqual({ kind: "native" });
    expect(linkBoxSize(linkView("https://vimeo.com/1234"))).toBeNull();
    expect(linkView("https://www.instagram.com/snf.studio/")).toMatchObject({ kind: "card", site: "instagram.com", page: "/snf.studio" });
    expect(linkView("https://drive.google.com/drive/folders/abc?usp=sharing")).toMatchObject({ kind: "card", site: "drive.google.com", page: "/drive/folders/abc" });
    expect(linkBoxSize(linkView("https://example.com"))).toEqual({ width: 320, height: 112 });
    expect(linkView("javascript:alert(1)")).toBeNull();
  });
});
