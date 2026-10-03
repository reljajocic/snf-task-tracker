"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { CONTENT_NAV, isActive } from "@/components/shell/nav";

/** Phones have one "Content" tab in the bottom bar; this switches between its pages. */
export function ContentTabs() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  return (
    <nav className="no-scrollbar flex gap-1.5 overflow-x-auto px-5 pb-1 pt-3 lg:hidden">
      {CONTENT_NAV.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex h-9 flex-none items-center rounded-full border px-3.5 text-[13px] font-medium ${
              active ? "border-seg bg-seg text-seg-ink" : "border-line2 text-ink2"
            }`}
          >
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
}
