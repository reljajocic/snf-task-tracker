// Single source for navigation.
import type { NavIconName } from "./icons";

export type NavItem = { href: string; key: string; icon: NavIconName; match?: string[] };

export const SIDEBAR_NAV: NavItem[] = [
  { href: "/", key: "home", icon: "home" },
  { href: "/kanban", key: "kanban", icon: "kanban" },
  { href: "/calendar", key: "calendar", icon: "calendar" },
  { href: "/tasks", key: "list", icon: "list" },
  { href: "/clients", key: "clients", icon: "clients" },
];

// "Content" group (design: SADRŽAJ): video bank, posting schedule and shoot days.
export const CONTENT_NAV: NavItem[] = [
  { href: "/content/videos", key: "videos", icon: "videos" },
  { href: "/content/schedule", key: "schedule", icon: "schedule" },
  { href: "/content/shoots", key: "shoots", icon: "shoots" },
];

export const ADMIN_NAV: NavItem[] = [{ href: "/team", key: "team", icon: "team" }];

// Mobile bottom bar: Kanban and list share the "Tasks" tab.
export const MOBILE_NAV: NavItem[] = [
  { href: "/", key: "home", icon: "home" },
  { href: "/kanban", key: "tasks", icon: "kanban", match: ["/kanban", "/tasks"] },
  { href: "/content/videos", key: "content", icon: "schedule", match: ["/content"] },
  { href: "/calendar", key: "calendar", icon: "calendar" },
  { href: "/clients", key: "clients", icon: "clients" },
];

export function isActive(pathname: string, item: NavItem): boolean {
  const prefixes = item.match ?? [item.href];
  return prefixes.some((p) => (p === "/" ? pathname === "/" : pathname.startsWith(p)));
}
