// Client/project constants that client components can import too.
export const CLIENT_STATUSES = ["active", "prospect", "paused", "finished"] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export const CLIENT_STATUS_COLOR: Record<ClientStatus, string> = {
  active: "var(--client-active)",
  prospect: "var(--client-prospect)",
  paused: "var(--client-paused)",
  finished: "var(--client-finished)",
};

export const PROJECT_STATUSES = ["active", "on_hold", "completed", "archived"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_COLOR: Record<ProjectStatus, string> = {
  active: "var(--client-active)",
  on_hold: "var(--client-paused)",
  completed: "var(--client-finished)",
  archived: "var(--client-finished)",
};

/** "NoLimit Gym" → "NG" */
export function clientInitials(name: string) {
  return name
    .replace(/[[\]()]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
