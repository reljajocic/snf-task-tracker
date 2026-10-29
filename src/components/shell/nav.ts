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

// "Content" group (design: SADRŽAJ), in the order the work goes: the bank of posts (ideas), shoot days,
// then the posting schedule.
export const CONTENT_NAV: NavItem[] = [
  { href: "/content/videos", key: "videos", icon: "videos" },
  { href: "/content/shoots", key: "shoots", icon: "shoots" },
  { href: "/content/schedule", key: "schedule", icon: "schedule" },
];

// With the account at the bottom of the sidebar: everyone's own settings.
export const SETTINGS_NAV: NavItem = { href: "/settings", key: "settings", icon: "settings" };

// The admin login only oversees: its overview, the clients (settings, portal), the team (and invoices, see Sidebar).
export const ADMIN_ONLY_NAV: NavItem[] = [
  { href: "/", key: "dashboard", icon: "home" },
  { href: "/clients", key: "clients", icon: "clients" },
  { href: "/team", key: "team", icon: "team" },
];

// Partners, and client managers picked to handle a client's invoices.
export const INVOICES_NAV: NavItem = { href: "/invoices", key: "invoices", icon: "invoices" };

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
