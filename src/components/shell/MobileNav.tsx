"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { NAV_ICONS } from "./icons";
import { ADMIN_ONLY_NAV, MOBILE_NAV, isActive } from "./nav";

/**
 * Mobile bottom bar: a floating glass bar (60px, 8px above the home-indicator area, so 68px in all as before) the page
 * scrolls under; orange 18×3 marker, icon and label; the active tab is accented.
 */
export function MobileNav({ admin = false }: { admin?: boolean }) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav className="glass fixed inset-x-3 bottom-[calc(var(--nav-bottom)+8px)] z-30 flex h-[60px] rounded-full px-1.5 lg:hidden">
      {(admin ? ADMIN_ONLY_NAV : MOBILE_NAV).map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-1 flex-col items-center justify-center gap-1 text-[12px] font-medium ${
              active ? "text-ink" : "text-ink3"
            }`}
          >
            <span className={`h-[3px] w-[18px] rounded-[2px] ${active ? "bg-accent" : "bg-transparent"}`} />
            <span className={active ? "text-accent" : ""}>{NAV_ICONS[item.icon]}</span>
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
}
