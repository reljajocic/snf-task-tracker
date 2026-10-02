import type { MetadataRoute } from "next";

// Installable on phones ("Add to Home Screen"); opens without browser chrome.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Slate 'n' Frame Tasks",
    short_name: "SnF Tasks",
    description: "Internal task tracker for the Slate 'n' Frame team.",
    start_url: "/",
    display: "standalone",
    background_color: "#2F2D2E",
    theme_color: "#2F2D2E",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
