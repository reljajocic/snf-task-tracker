"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { CONTENT_NAV, isActive } from "@/components/shell/nav";
import { Segmented } from "@/components/ui/Segmented";

/**
 * Content bank · Shoots · Schedule: one place, switched from the top (the client carries over). On phones
 * the row ends with "+": a new post on the bank and the schedule, a new shoot day on shoots.
 */
export function ContentTabs() {
  const t = useTranslations("nav");
  const tAll = useTranslations();
  const pathname = usePathname();
  const params = useSearchParams();
  const client = params.get("client");
  // A client opened by link (e.g. from the client page) becomes the remembered one too.
  useEffect(() => {
    if (client && client !== "all") document.cookie = `snf-client=${client}; path=/; max-age=31536000; samesite=lax`;
  }, [client]);
  // The client shown: from the link, else the remembered one (the page falls back to it the same way).
  const remembered = useSyncExternalStore(onClientShown, readRememberedClient, () => null);
  const shown = client && client !== "all" ? client : remembered;
  const onShoots = pathname.startsWith("/content/shoots");
  const tab = params.get("tab");
  const plus = onShoots
    ? { href: shown ? `/content/shoots/new?client=${shown}` : "/content/shoots/new", label: tAll("shoots.new") }
    : {
        href: `${pathname}?${new URLSearchParams({
          ...Object.fromEntries(params),
          new: "1",
          kind: "video",
          ...(shown ? { client: shown } : {}),
          ...(pathname.startsWith("/content/videos") && !tab ? { stage: "shot" } : {}),
        })}`,
        label: tAll("bank.new"),
      };
  return (
    <nav className="flex items-center gap-2 px-5 pb-1 pt-4 lg:px-10 lg:pt-6">
      <div className="no-scrollbar min-w-0 overflow-x-auto">
        {/* Phones: short names, so the three and "+" fit one row. */}
        <span className="lg:hidden">
          <Segmented size="sm" nowrap items={CONTENT_NAV.map((item) => ({ key: item.href, label: t(`${item.key}Short`), href: item.href, active: isActive(pathname, item) }))} />
        </span>
        <span className="hidden lg:block">
          <Segmented size="sm" nowrap items={CONTENT_NAV.map((item) => ({ key: item.href, label: t(item.key), href: item.href, active: isActive(pathname, item) }))} />
        </span>
      </div>
      <Link href={plus.href} scroll={false} aria-label={plus.label} title={plus.label} className="ml-auto grid size-9 flex-none place-items-center rounded-full bg-accent text-[22px] font-light leading-none text-charcoal lg:hidden">
        +
      </Link>
    </nav>
  );
}

const onClientShown = (cb: () => void) => {
  window.addEventListener(CLIENT_SHOWN, cb);
  return () => window.removeEventListener(CLIENT_SHOWN, cb);
};
const readRememberedClient = () => document.cookie.match(/(?:^|; )snf-client=([^;]+)/)?.[1] ?? null;

const CLIENT_SHOWN = "snf-client-shown";

/** Put on a content page: the client it shows (picked or fallen back to) is remembered, and "+" uses it. */
export function ShownClient({ id }: { id: string }) {
  useEffect(() => {
    document.cookie = `snf-client=${id}; path=/; max-age=31536000; samesite=lax`;
    window.dispatchEvent(new Event(CLIENT_SHOWN));
  }, [id]);
  return null;
}
