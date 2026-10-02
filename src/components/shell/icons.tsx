// Navigation glyphs drawn for this app (the brand system bans stock icon libraries).
// Simple 1.6px strokes on a 20×20 grid: squares and circles, like the brand mark.
import type { SVGProps } from "react";

function Icon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 20 20"
      width={20}
      height={20}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    />
  );
}

export const NAV_ICONS = {
  home: (
    <Icon>
      <path d="M3 9.5 10 3.5l7 6" />
      <path d="M5 8.2V16.5h10V8.2" />
    </Icon>
  ),
  kanban: (
    <Icon>
      <rect x="3" y="3.5" width="4" height="13" rx="1" />
      <rect x="8.5" y="3.5" width="4" height="9" rx="1" />
      <rect x="14" y="3.5" width="3" height="6" rx="1" />
    </Icon>
  ),
  calendar: (
    <Icon>
      <rect x="3" y="4.5" width="14" height="12" rx="1.5" />
      <path d="M3 8.5h14M7 2.8v3.2M13 2.8v3.2" />
    </Icon>
  ),
  list: (
    <Icon>
      <path d="M7.5 5.5H17M7.5 10H17M7.5 14.5H17" />
      <circle cx="4" cy="5.5" r=".9" fill="currentColor" stroke="none" />
      <circle cx="4" cy="10" r=".9" fill="currentColor" stroke="none" />
      <circle cx="4" cy="14.5" r=".9" fill="currentColor" stroke="none" />
    </Icon>
  ),
  clients: (
    <Icon>
      <rect x="3.5" y="3.5" width="8" height="13" rx="1" />
      <path d="M11.5 8.5h5v8h-5M6 7h3M6 10h3M6 13h3" />
    </Icon>
  ),
  team: (
    <Icon>
      <circle cx="7.5" cy="7" r="2.8" />
      <path d="M2.8 16c.6-2.6 2.4-4 4.7-4s4.1 1.4 4.7 4" />
      <circle cx="14" cy="7.8" r="2.2" />
      <path d="M13.6 12.1c1.9.1 3.2 1.3 3.7 3.4" />
    </Icon>
  ),
  schedule: (
    <Icon>
      <rect x="3" y="4.5" width="14" height="12" rx="1.5" />
      <path d="M3 8.5h14M7 2.8v3.2M13 2.8v3.2" />
      <path d="M8.3 11.2v3.2l2.9-1.6Z" fill="currentColor" stroke="none" />
    </Icon>
  ),
  shoots: (
    <Icon>
      <rect x="3" y="8" width="14" height="8.5" rx="1" />
      <path d="M3 8 15.6 4.4l.6 2.1L3.6 10.1M7.2 6.8l1.4 2.4M11.3 5.6l1.4 2.4" />
    </Icon>
  ),
  settings: (
    <Icon>
      <circle cx="10" cy="10" r="2.6" />
      <path d="M10 2.8v2M10 15.2v2M2.8 10h2M15.2 10h2M4.9 4.9l1.4 1.4M13.7 13.7l1.4 1.4M4.9 15.1l1.4-1.4M13.7 6.3l1.4-1.4" />
    </Icon>
  ),
  sun: (
    <Icon>
      <circle cx="10" cy="10" r="3.2" />
      <path d="M10 2.5v1.8M10 15.7v1.8M2.5 10h1.8M15.7 10h1.8M4.7 4.7l1.3 1.3M14 14l1.3 1.3M4.7 15.3 6 14M14 6l1.3-1.3" />
    </Icon>
  ),
  moon: (
    <Icon>
      <path d="M15.5 12.4A6 6 0 0 1 7.6 4.5a6 6 0 1 0 7.9 7.9Z" />
    </Icon>
  ),
  collapse: (
    <Icon>
      <rect x="3" y="3.5" width="14" height="13" rx="1.5" />
      <path d="M8 3.5v13M13.2 8 11.2 10l2 2" />
    </Icon>
  ),
  expand: (
    <Icon>
      <rect x="3" y="3.5" width="14" height="13" rx="1.5" />
      <path d="M8 3.5v13M11.2 8l2 2-2 2" />
    </Icon>
  ),
  signOut: (
    <Icon>
      <path d="M8 3.5H4.5v13H8M12.5 6.5 16 10l-3.5 3.5M16 10H8" />
    </Icon>
  ),
} as const;

export type NavIconName = keyof typeof NAV_ICONS;
