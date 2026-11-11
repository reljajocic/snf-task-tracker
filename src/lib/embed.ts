/** Turns a share link into an embeddable player URL (Drive, YouTube, Vimeo), or null. */
export function embedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "drive.google.com") {
      const id = u.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ?? u.searchParams.get("id");
      return id ? `https://drive.google.com/file/d/${id}/preview` : null;
    }
    if (host === "youtu.be") return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (host.endsWith("youtube.com")) {
      const id = u.searchParams.get("v") ?? u.pathname.match(/\/(?:shorts|embed)\/([^/]+)/)?.[1];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host === "vimeo.com") {
      const id = u.pathname.match(/\/(\d+)/)?.[1];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

const VIDEO_FILE = /\.(mp4|m4v|mov|webm)$/i;

/**
 * A Dropbox share link to a video file, as a direct file URL the browser's own player can play (raw=1 keeps the
 * link's key), or null: folders and other files have no player and stay a link to open.
 */
export function dropboxVideoUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "dl.dropboxusercontent.com") return VIDEO_FILE.test(u.pathname) ? u.href : null;
    if (host !== "dropbox.com" || !/^\/(scl\/fi|s)\//.test(u.pathname) || !VIDEO_FILE.test(decodeURIComponent(u.pathname))) return null;
    u.hostname = "www.dropbox.com";
    u.searchParams.delete("dl");
    u.searchParams.set("raw", "1");
    return u.href;
  } catch {
    return null;
  }
}
