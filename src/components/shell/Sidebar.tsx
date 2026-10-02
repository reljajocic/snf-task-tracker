"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/Avatar";
import type { Profile } from "@/lib/auth";
import type { Theme } from "@/lib/theme";
import { ADMIN_NAV, SIDEBAR_NAV, isActive, type NavItem } from "./nav";
import { ThemeToggle } from "./ThemeToggle";

function NavLink({ item, active, label }: { item: NavItem; active: boolean; label: string }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex h-11 items-center gap-3 whitespace-nowrap rounded-md px-3 text-[15px] font-medium transition-colors duration-[var(--dur-fast)] ${
        active ? "bg-chip text-ink" : "text-ink2 hover:text-ink"
      }`}
    >
      <span className={`h-[18px] w-[3px] rounded-[2px] ${active ? "bg-accent" : "bg-transparent"}`} />
      {label}
    </Link>
  );
}

/** Desktop sidebar, 240px (design: every desktop screen). */
export function Sidebar({ profile, theme }: { profile: Profile; theme: Theme }) {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 flex-none flex-col gap-7 border-r border-line bg-side px-4 pb-5 pt-7 lg:flex">
      <div className="flex items-center gap-3 px-2.5">
        <img
          src="/brand/logo-off-white.png"
          alt="Slate 'n' Frame"
          className="h-[26px] [filter:var(--logo-filter)]"
        />
        <span className="text-[11px] font-medium uppercase leading-tight tracking-[0.14em] text-ink3">
          {t("common.appSection")}
        </span>
      </div>

      <nav className="flex flex-col gap-0.5">
        {SIDEBAR_NAV.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(pathname, item)} label={t(`nav.${item.key}`)} />
        ))}
        {profile.role === "admin" && (
          <>
            <div className="eyebrow px-3 pb-2 pt-5">{t("nav.adminGroup")}</div>
            {ADMIN_NAV.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(pathname, item)} label={t(`nav.${item.key}`)} />
            ))}
          </>
        )}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        <ThemeToggle initial={theme} />
        <div className="flex items-center gap-2.5 px-1">
          <Link href="/settings" className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md hover:text-ink" title={t("nav.settings")}>
            <Avatar person={profile} size={28} />
            <span className="min-w-0 flex-1 truncate text-[13px] text-ink2">{profile.full_name}</span>
          </Link>
          <form action="/auth/signout" method="post">
            <button type="submit" className="cursor-pointer text-[12px] text-ink3 hover:text-ink">
              {t("common.signOut")}
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
