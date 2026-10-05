"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { CONTENT_NAV, isActive } from "@/components/shell/nav";

/** Shoots · Schedule · Video bank: one place, switched from the top (the client carries over). */
export function ContentTabs() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const client = useSearchParams().get("client");
  // A client opened by link (e.g. from the client page) becomes the remembered one too.
  useEffect(() => {
    if (client && client !== "all") document.cookie = `snf-client=${client}; path=/; max-age=31536000; samesite=lax`;
  }, [client]);
  return (
    <nav className="no-scrollbar flex gap-1.5 overflow-x-auto px-5 pb-1 pt-3 lg:px-10 lg:pt-6">
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
