import { NextResponse } from "next/server";
import { getPortal } from "@/lib/portal";

// "Add to Home Screen" from a client portal opens that portal full screen (not the team login).
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const portal = await getPortal(token);
  if (!portal) return new NextResponse("Not found", { status: 404 });
  return NextResponse.json(
    {
      name: `${portal.clientName} · Slate n' Frame`,
      short_name: portal.clientName,
      start_url: `/p/${token}`,
      scope: `/p/${token}`,
      display: "standalone",
      background_color: "#121011",
      theme_color: "#121011",
      icons: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
    },
    { headers: { "content-type": "application/manifest+json" } },
  );
}
