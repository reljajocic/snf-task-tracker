// Single source for navigation. The "content" group (schedule, shoots) arrives in phase 2.
export type NavItem = { href: string; key: string; match?: string[] };

export const SIDEBAR_NAV: NavItem[] = [
  { href: "/", key: "home" },
  { href: "/kanban", key: "kanban" },
  { href: "/calendar", key: "calendar" },
  { href: "/tasks", key: "list" },
  { href: "/clients", key: "clients" },
];

export const ADMIN_NAV: NavItem[] = [{ href: "/team", key: "team" }];

// Mobile bottom bar: Kanban and list share the "Tasks" tab.
export const MOBILE_NAV: NavItem[] = [
  { href: "/", key: "home" },
  { href: "/kanban", key: "tasks", match: ["/kanban", "/tasks"] },
  { href: "/calendar", key: "calendar" },
  { href: "/clients", key: "clients" },
];

export function isActive(pathname: string, item: NavItem): boolean {
  const prefixes = item.match ?? [item.href];
  return prefixes.some((p) => (p === "/" ? pathname === "/" : pathname.startsWith(p)));
}
