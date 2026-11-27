"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { NAV_ICONS } from "./icons";
import { ADMIN_ONLY_NAV, MOBILE_NAV, isActive } from "./nav";

/**
 * Mobile bottom bar: a floating glass bar (64px, inset like the page and 14px above the home-indicator area: 78px in all) the page
 * scrolls under; icon and label, the active tab on a soft capsule with its icon in the accent.
 */
export function MobileNav({ admin = false }: { admin?: boolean }) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav className="glass fixed inset-x-5 bottom-[calc(var(--nav-bottom)+14px)] z-30 flex h-16 gap-1 rounded-full p-1.5 lg:hidden">
      {(admin ? ADMIN_ONLY_NAV : MOBILE_NAV).map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full text-[12px] font-medium ${
              active ? "bg-[var(--glass-active)] text-ink" : "text-ink3"
            }`}
          >
            <span className={active ? "text-accent" : ""}>{NAV_ICONS[item.icon]}</span>
            <span className="max-w-full truncate px-1">{t(item.key)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
