// Single source for navigation.
import type { NavIconName } from "./icons";

export type NavItem = { href: string; key: string; icon: NavIconName; match?: string[] };

// Board, list and calendar are three views of one "Tasks" page (tabs inside it).
const TASK_VIEWS = ["/kanban", "/tasks", "/calendar"];

export const SIDEBAR_NAV: NavItem[] = [
  { href: "/", key: "home", icon: "home" },
  { href: "/kanban", key: "tasks", icon: "kanban", match: TASK_VIEWS },
  { href: "/clients", key: "clients", icon: "clients" },
];

// "Content" group (design: SADRŽAJ): video bank, posting schedule and shoot days.
export const CONTENT_NAV: NavItem[] = [
  { href: "/content/shoots", key: "shoots", icon: "shoots" },
  { href: "/content/schedule", key: "schedule", icon: "schedule" },
  { href: "/content/videos", key: "videos", icon: "videos" },
];

export const ADMIN_NAV: NavItem[] = [{ href: "/team", key: "team", icon: "team" }];

// Mobile bottom bar: four places; Tasks and Content switch views with tabs at the top.
export const MOBILE_NAV: NavItem[] = [
  { href: "/", key: "home", icon: "home" },
  { href: "/kanban", key: "tasks", icon: "kanban", match: TASK_VIEWS },
  { href: "/content/shoots", key: "content", icon: "videos", match: ["/content"] },
  { href: "/clients", key: "clients", icon: "clients" },
];

export function isActive(pathname: string, item: NavItem): boolean {
  const prefixes = item.match ?? [item.href];
  return prefixes.some((p) => (p === "/" ? pathname === "/" : pathname.startsWith(p)));
}
