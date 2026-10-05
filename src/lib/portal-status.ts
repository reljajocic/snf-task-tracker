// Shared by the portal's server pages and its client components (portal.ts is server-only).

/** What the client sees for a video: published / waiting for you / ready / in editing / in preparation. */
export type PortalStatus = "published" | "awaiting" | "ready" | "editing" | "preparing";

export const PORTAL_STATUS_COLOR: Record<PortalStatus, string> = {
  published: "var(--status-done)",
  awaiting: "var(--accent)",
  ready: "var(--status-in-progress)",
  editing: "var(--status-waiting)",
  preparing: "var(--status-todo)",
};
