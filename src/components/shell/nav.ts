// Single source for navigation. The "content" group (schedule, shoots) arrives in phase 2.
import type { NavIconName } from "./icons";

export type NavItem = { href: string; key: string; icon: NavIconName; match?: string[] };

export const SIDEBAR_NAV: NavItem[] = [
  { href: "/", key: "home", icon: "home" },
  { href: "/kanban", key: "kanban", icon: "kanban" },
  { href: "/calendar", key: "calendar", icon: "calendar" },
  { href: "/tasks", key: "list", icon: "list" },
  { href: "/clients", key: "clients", icon: "clients" },
];

export const ADMIN_NAV: NavItem[] = [{ href: "/team", key: "team", icon: "team" }];

// Mobile bottom bar: Kanban and list share the "Tasks" tab.
export const MOBILE_NAV: NavItem[] = [
  { href: "/", key: "home", icon: "home" },
  { href: "/kanban", key: "tasks", icon: "kanban", match: ["/kanban", "/tasks"] },
  { href: "/calendar", key: "calendar", icon: "calendar" },
  { href: "/clients", key: "clients", icon: "clients" },
];

export function isActive(pathname: string, item: NavItem): boolean {
  const prefixes = item.match ?? [item.href];
  return prefixes.some((p) => (p === "/" ? pathname === "/" : pathname.startsWith(p)));
}
