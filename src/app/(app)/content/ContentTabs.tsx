"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { CONTENT_NAV, isActive } from "@/components/shell/nav";
import { Segmented } from "@/components/ui/Segmented";

/** Content bank · Shoots · Schedule: one place, switched from the top (the client carries over). */
export function ContentTabs() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const client = useSearchParams().get("client");
  // A client opened by link (e.g. from the client page) becomes the remembered one too.
  useEffect(() => {
    if (client && client !== "all") document.cookie = `snf-client=${client}; path=/; max-age=31536000; samesite=lax`;
  }, [client]);
  return (
    <nav className="no-scrollbar overflow-x-auto px-5 pb-1 pt-3 lg:px-10 lg:pt-6">
      <Segmented size="sm" items={CONTENT_NAV.map((item) => ({ key: item.href, label: t(item.key), href: item.href, active: isActive(pathname, item) }))} />
    </nav>
  );
}
