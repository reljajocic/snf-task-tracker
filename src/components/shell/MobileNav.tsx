"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { NAV_ICONS } from "./icons";
import { MOBILE_NAV, isActive } from "./nav";

/** Mobile bottom bar, 68px + the home-indicator area: orange 18×3 marker, icon and label; the active tab is accented. */
export function MobileNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-[calc(68px+env(safe-area-inset-bottom))] border-t border-line bg-side pb-[env(safe-area-inset-bottom)] lg:hidden">
      {MOBILE_NAV.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-1 flex-col items-center justify-center gap-1.5 text-[12px] font-medium ${
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
