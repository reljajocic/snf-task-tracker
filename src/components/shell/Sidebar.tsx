"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import type { Profile } from "@/lib/auth";
import { SIDEBAR_COOKIE, type Theme } from "@/lib/theme";
import { NAV_ICONS } from "./icons";
import { ADMIN_NAV, CONTENT_NAV, SIDEBAR_NAV, isActive, type NavItem } from "./nav";
import { ThemeToggle } from "./ThemeToggle";

function NavLink({ item, active, label, collapsed }: { item: NavItem; active: boolean; label: string; collapsed: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      title={collapsed ? label : undefined}
      className={`relative flex h-11 items-center gap-3 whitespace-nowrap rounded-md text-[15px] font-medium transition-colors duration-[var(--dur-fast)] ${
        collapsed ? "justify-center px-0" : "px-3"
      } ${active ? "bg-chip text-ink" : "text-ink2 hover:text-ink"}`}
    >
      <span className={`h-[18px] w-[3px] flex-none rounded-[2px] ${active ? "bg-accent" : "bg-transparent"} ${collapsed ? "absolute left-0" : ""}`} />
      <span className="flex-none">{NAV_ICONS[item.icon]}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

/** Desktop sidebar: 240px, or a 72px icon rail when collapsed (remembered in a cookie). */
export function Sidebar({ profile, theme, initialCollapsed }: { profile: Profile; theme: Theme; initialCollapsed: boolean }) {
  const t = useTranslations();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "open"}; path=/; max-age=31536000; samesite=lax`;
  };

  const toggleLabel = collapsed ? t("nav.expand") : t("nav.collapse");

  return (
    <aside
      className={`sticky top-0 hidden h-dvh flex-none flex-col gap-7 border-r border-line bg-side pb-5 pt-7 transition-[width] duration-[var(--dur-base)] ease-[var(--ease-standard)] lg:flex ${
        collapsed ? "w-[72px] px-3" : "w-60 px-4"
      }`}
    >
      <div className={`flex items-center ${collapsed ? "flex-col gap-4" : "gap-3 px-2.5"}`}>
        <Link href="/" className="flex-none">
          <img
            src="/brand/logo-off-white.png"
            alt="Slate 'n' Frame"
            className={`[filter:var(--logo-filter)] ${collapsed ? "h-[15px]" : "h-[26px]"}`}
          />
        </Link>
        {!collapsed && (
          <span className="text-[11px] font-medium uppercase leading-tight tracking-[0.14em] text-ink3">{t("common.appSection")}</span>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={toggleLabel}
          title={toggleLabel}
          aria-expanded={!collapsed}
          className={`grid size-8 flex-none cursor-pointer place-items-center rounded-md text-ink3 hover:bg-chip hover:text-ink ${collapsed ? "" : "ml-auto"}`}
        >
          {collapsed ? NAV_ICONS.expand : NAV_ICONS.collapse}
        </button>
      </div>

      <nav className="flex flex-col gap-0.5">
        {SIDEBAR_NAV.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(pathname, item)} label={t(`nav.${item.key}`)} collapsed={collapsed} />
        ))}
        {collapsed ? <div className="mx-3 my-3 border-t border-line" /> : <div className="eyebrow px-3 pb-2 pt-5">{t("nav.contentGroup")}</div>}
        {CONTENT_NAV.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(pathname, item)} label={t(`nav.${item.key}`)} collapsed={collapsed} />
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        {/* Team and settings sit with the account, out of the day-to-day menu. */}
        {profile.role === "admin" &&
          ADMIN_NAV.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(pathname, item)} label={t(`nav.${item.key}`)} collapsed={collapsed} />
          ))}
        <ThemeToggle initial={theme} compact={collapsed} />
        <div className={`flex items-center gap-2.5 ${collapsed ? "flex-col" : "px-1"}`}>
          <Link
            href="/settings"
            title={t("nav.settings")}
            className={`flex min-w-0 items-center gap-2.5 rounded-md hover:text-ink ${collapsed ? "" : "flex-1"}`}
          >
            <Avatar person={profile} size={28} />
            {!collapsed && <span className="min-w-0 flex-1 truncate text-[13px] text-ink2">{profile.full_name}</span>}
          </Link>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              title={t("common.signOut")}
              aria-label={t("common.signOut")}
              className="cursor-pointer text-[12px] text-ink3 hover:text-ink"
            >
              {collapsed ? NAV_ICONS.signOut : t("common.signOut")}
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
